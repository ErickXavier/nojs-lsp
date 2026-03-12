// ═══════════════════════════════════════════════════════════════════════
//  DevTools Bridge — CDP client for live NoJS runtime integration
//  Connects to Chrome/Edge via Chrome DevTools Protocol to evaluate
//  expressions in the running page's NoJS devtools context.
// ═══════════════════════════════════════════════════════════════════════

import * as http from 'http';

export interface DevToolsBridgeOptions {
  port: number;     // CDP port (default 9222)
  host: string;     // CDP host (default localhost)
}

interface CDPTarget {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl: string;
}

interface CDPMessage {
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface LiveStoreData {
  name: string;
  data: Record<string, unknown> | null;
  contextId?: number;
}

export interface LiveStats {
  contexts: number;
  stores: number;
  listeners: number;
  refs: number;
  hasRouter: boolean;
  locale: string;
}

export interface LiveElementInfo {
  selector: string;
  tag: string;
  hasContext: boolean;
  contextId: number | null;
  data: Record<string, unknown> | null;
  directives: Array<{ name: string; value: string }>;
}

export class DevToolsBridge {
  private _options: DevToolsBridgeOptions;
  private _ws: WebSocket | null = null;
  private _msgId = 0;
  private _pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private _connected = false;
  private _targetUrl: string | null = null;

  constructor(options?: Partial<DevToolsBridgeOptions>) {
    this._options = {
      port: options?.port ?? 9222,
      host: options?.host ?? 'localhost',
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  get targetUrl(): string | null {
    return this._targetUrl;
  }

  get options(): Readonly<DevToolsBridgeOptions> {
    return this._options;
  }

  // ─── Connection ────────────────────────────────────────────────────────

  async connect(): Promise<boolean> {
    try {
      const targets = await this._listTargets();
      // Find a page target with __NOJS_DEVTOOLS__ (or just the first page)
      const pageTargets = targets.filter(t => t.type === 'page');
      if (pageTargets.length === 0) return false;

      // Try each page to find one with NoJS devtools
      for (const target of pageTargets) {
        if (!target.webSocketDebuggerUrl) continue;
        const connected = await this._connectToTarget(target);
        if (connected) {
          const hasDevtools = await this._checkNoJSDevtools();
          if (hasDevtools) {
            this._targetUrl = target.url;
            return true;
          }
          this.disconnect();
        }
      }

      // Fallback: connect to first page even without devtools
      const firstTarget = pageTargets.find(t => t.webSocketDebuggerUrl);
      if (firstTarget) {
        await this._connectToTarget(firstTarget);
        this._targetUrl = firstTarget.url;
        return this._connected;
      }

      return false;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }
    this._connected = false;
    this._targetUrl = null;
    this._pending.clear();
  }

  // ─── NoJS DevTools API ─────────────────────────────────────────────────

  async inspectStore(name: string): Promise<LiveStoreData | null> {
    const result = await this._evalInPage(
      `window.__NOJS_DEVTOOLS__ ? JSON.stringify(window.__NOJS_DEVTOOLS__.inspectStore(${JSON.stringify(name)})) : null`
    );
    if (!result) return null;
    try {
      return JSON.parse(result as string);
    } catch {
      return null;
    }
  }

  async getStoreNames(): Promise<string[]> {
    const result = await this._evalInPage(
      `window.__NOJS_DEVTOOLS__ ? JSON.stringify(Object.keys(window.__NOJS_DEVTOOLS__.stores)) : '[]'`
    );
    if (result == null) return [];
    try {
      return JSON.parse(result as string);
    } catch {
      return [];
    }
  }

  async getStoreProperty(storeName: string, propertyPath: string): Promise<unknown> {
    // Sanitize inputs to prevent injection
    const safeName = JSON.stringify(storeName);
    const safePath = JSON.stringify(propertyPath);
    const result = await this._evalInPage(
      `(function() {
        if (!window.__NOJS_DEVTOOLS__) return null;
        var s = window.__NOJS_DEVTOOLS__.stores[${safeName}];
        if (!s) return null;
        var parts = ${safePath}.split('.');
        var v = s;
        for (var i = 0; i < parts.length; i++) {
          if (v == null) return null;
          v = v[parts[i]];
        }
        return JSON.stringify(v);
      })()`
    );
    if (result == null) return undefined;
    try {
      return JSON.parse(result as string);
    } catch {
      return result;
    }
  }

  async inspectElement(selector: string): Promise<LiveElementInfo | null> {
    const safeSelector = JSON.stringify(selector);
    const result = await this._evalInPage(
      `window.__NOJS_DEVTOOLS__ ? JSON.stringify(window.__NOJS_DEVTOOLS__.inspect(${safeSelector})) : null`
    );
    if (!result) return null;
    try {
      return JSON.parse(result as string);
    } catch {
      return null;
    }
  }

  async getStats(): Promise<LiveStats | null> {
    const result = await this._evalInPage(
      `window.__NOJS_DEVTOOLS__ ? JSON.stringify(window.__NOJS_DEVTOOLS__.stats()) : null`
    );
    if (!result) return null;
    try {
      return JSON.parse(result as string);
    } catch {
      return null;
    }
  }

  async evaluateExpression(expr: string): Promise<unknown> {
    // Evaluate an arbitrary expression in the page context
    // Wrap in try-catch for safety
    const safeExpr = JSON.stringify(expr);
    const result = await this._evalInPage(
      `(function() {
        try {
          var __r = eval(${safeExpr});
          return JSON.stringify(__r);
        } catch(e) {
          return JSON.stringify({ __error: e.message });
        }
      })()`
    );
    if (result == null) return undefined;
    try {
      return JSON.parse(result as string);
    } catch {
      return result;
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  private _listTargets(): Promise<CDPTarget[]> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://${this._options.host}:${this._options.port}/json`,
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid CDP response'));
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('CDP connection timeout'));
      });
    });
  }

  private _connectToTarget(target: CDPTarget): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this._ws = new WebSocket(target.webSocketDebuggerUrl);

        const timeout = setTimeout(() => {
          this.disconnect();
          resolve(false);
        }, 5000);

        this._ws.onopen = () => {
          clearTimeout(timeout);
          this._connected = true;
          resolve(true);
        };

        this._ws.onmessage = (event: MessageEvent) => {
          try {
            const msg: CDPMessage = JSON.parse(event.data as string);
            const pending = this._pending.get(msg.id);
            if (pending) {
              this._pending.delete(msg.id);
              if (msg.error) {
                pending.reject(new Error(msg.error.message));
              } else {
                pending.resolve(msg.result);
              }
            }
          } catch { /* ignore malformed messages */ }
        };

        this._ws.onerror = () => {
          clearTimeout(timeout);
          this.disconnect();
          resolve(false);
        };

        this._ws.onclose = () => {
          this._connected = false;
        };
      } catch {
        resolve(false);
      }
    });
  }

  private _sendCDP(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this._ws || !this._connected) {
        reject(new Error('Not connected'));
        return;
      }
      const id = ++this._msgId;
      this._pending.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error('CDP request timeout'));
      }, 5000);

      const origResolve = this._pending.get(id)!.resolve;
      this._pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); origResolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      this._ws.send(JSON.stringify({ id, method, params }));
    });
  }

  private async _evalInPage(expression: string): Promise<unknown> {
    if (!this._connected) return null;
    try {
      const result = await this._sendCDP('Runtime.evaluate', {
        expression,
        returnByValue: true,
      }) as { result?: { value?: unknown } };
      return result?.result?.value ?? null;
    } catch {
      return null;
    }
  }

  private async _checkNoJSDevtools(): Promise<boolean> {
    const result = await this._evalInPage('typeof window.__NOJS_DEVTOOLS__ !== "undefined"');
    return result === true;
  }
}

// ─── Singleton instance ──────────────────────────────────────────────────

let _bridge: DevToolsBridge | null = null;

export function getDevToolsBridge(): DevToolsBridge | null {
  return _bridge;
}

export function createDevToolsBridge(options?: Partial<DevToolsBridgeOptions>): DevToolsBridge {
  if (_bridge) _bridge.disconnect();
  _bridge = new DevToolsBridge(options);
  return _bridge;
}

export function destroyDevToolsBridge(): void {
  if (_bridge) {
    _bridge.disconnect();
    _bridge = null;
  }
}
