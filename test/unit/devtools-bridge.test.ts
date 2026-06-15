import {
  DevToolsBridge,
  createDevToolsBridge,
  getDevToolsBridge,
  destroyDevToolsBridge,
} from '../../server/src/devtools-bridge';

// ─── Tests ──────────────────────────────────────────────────────────────

describe('DevToolsBridge', () => {
  afterEach(() => {
    destroyDevToolsBridge();
  });

  // ─── Construction ───────────────────────────────────────────────────

  it('creates with default options', () => {
    const bridge = new DevToolsBridge();
    expect(bridge.connected).toBe(false);
    expect(bridge.targetUrl).toBeNull();
    expect(bridge.enabled).toBe(false);
  });

  it('creates with custom options', () => {
    const bridge = new DevToolsBridge({ port: 9333, host: '127.0.0.1' });
    expect(bridge.connected).toBe(false);
    expect(bridge.targetUrl).toBeNull();
    expect(bridge.options.port).toBe(9333);
    expect(bridge.options.host).toBe('127.0.0.1');
  });

  it('creates with partial options', () => {
    const bridge = new DevToolsBridge({ port: 9333 });
    expect(bridge.connected).toBe(false);
    expect(bridge.options.port).toBe(9333);
    expect(bridge.options.host).toBe('localhost');
  });

  it('options property is readonly', () => {
    const bridge = new DevToolsBridge({ port: 9222, host: 'localhost' });
    const opts = bridge.options;
    expect(opts.port).toBe(9222);
    expect(opts.host).toBe('localhost');
  });

  // ─── Enable gate ───────────────────────────────────────────────────

  describe('Enable gate', () => {
    it('enable() sets enabled to true', () => {
      const bridge = new DevToolsBridge();
      expect(bridge.enabled).toBe(false);
      bridge.enable();
      expect(bridge.enabled).toBe(true);
    });

    it('connect returns false when not enabled', async () => {
      const bridge = new DevToolsBridge({ port: 9222 });
      // Do not call enable()
      const result = await bridge.connect();
      expect(result).toBe(false);
      expect(bridge.connected).toBe(false);
    });

    it('connect proceeds when enabled (still fails without Chrome)', async () => {
      const bridge = new DevToolsBridge({ port: 19999 });
      bridge.enable();
      const result = await bridge.connect();
      expect(result).toBe(false);
    });
  });

  // ─── Singleton management ──────────────────────────────────────────

  it('createDevToolsBridge creates a singleton', () => {
    const bridge = createDevToolsBridge({ port: 9222 });
    expect(bridge).toBeInstanceOf(DevToolsBridge);
    expect(getDevToolsBridge()).toBe(bridge);
  });

  it('createDevToolsBridge replaces existing bridge', () => {
    const first = createDevToolsBridge({ port: 9222 });
    const second = createDevToolsBridge({ port: 9333 });
    expect(getDevToolsBridge()).toBe(second);
    expect(getDevToolsBridge()).not.toBe(first);
  });

  it('destroyDevToolsBridge clears the singleton', () => {
    createDevToolsBridge();
    expect(getDevToolsBridge()).not.toBeNull();
    destroyDevToolsBridge();
    expect(getDevToolsBridge()).toBeNull();
  });

  it('destroyDevToolsBridge is safe to call when no bridge exists', () => {
    expect(() => destroyDevToolsBridge()).not.toThrow();
  });

  it('getDevToolsBridge returns null initially', () => {
    expect(getDevToolsBridge()).toBeNull();
  });

  // ─── Connection (failure cases — no real Chrome) ───────────────────

  it('connect returns false when no Chrome is available', async () => {
    const bridge = new DevToolsBridge({ port: 19999 });
    bridge.enable();
    const result = await bridge.connect();
    expect(result).toBe(false);
    expect(bridge.connected).toBe(false);
  });

  it('disconnect is safe when not connected', () => {
    const bridge = new DevToolsBridge();
    expect(() => bridge.disconnect()).not.toThrow();
    expect(bridge.connected).toBe(false);
  });

  it('disconnect clears connection state', () => {
    const bridge = new DevToolsBridge();
    bridge.disconnect();
    expect(bridge.connected).toBe(false);
    expect(bridge.targetUrl).toBeNull();
  });

  it('disconnect clears pending requests', () => {
    const bridge = new DevToolsBridge();
    // Add some pending requests manually
    (bridge as any)._pending.set(1, { resolve: () => {}, reject: () => {} });
    (bridge as any)._pending.set(2, { resolve: () => {}, reject: () => {} });
    bridge.disconnect();
    expect((bridge as any)._pending.size).toBe(0);
  });

  // ─── API methods (disconnected) ───────────────────────────────────

  it('inspectStore returns null when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.inspectStore('user');
    expect(result).toBeNull();
  });

  it('getStoreNames returns empty array when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.getStoreNames();
    expect(result).toEqual([]);
  });

  it('getStoreProperty returns undefined when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.getStoreProperty('user', 'name');
    expect(result).toBeUndefined();
  });

  it('inspectElement returns null when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.inspectElement('#app');
    expect(result).toBeNull();
  });

  it('getStats returns null when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.getStats();
    expect(result).toBeNull();
  });

  it('evaluateExpression returns undefined when disconnected', async () => {
    const bridge = new DevToolsBridge();
    const result = await bridge.evaluateExpression('1 + 1');
    expect(result).toBeUndefined();
  });

  // ─── API methods (connected, mocked CDP) ──────────────────────────

  describe('API methods with mocked CDP', () => {
    function createConnectedBridge(): DevToolsBridge {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      return bridge;
    }

    // --- inspectStore ---
    it('inspectStore returns parsed data on success', async () => {
      const bridge = createConnectedBridge();
      const storeData = { name: 'user', data: { id: 1 } };
      (bridge as any)._sendCDP = async () => ({
        result: { value: JSON.stringify(storeData) },
      });

      const result = await bridge.inspectStore('user');
      expect(result).toEqual(storeData);
    });

    it('inspectStore returns null when devtools not available', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await bridge.inspectStore('user');
      expect(result).toBeNull();
    });

    it('inspectStore returns null on parse error', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: 'not-json' },
      });

      const result = await bridge.inspectStore('user');
      expect(result).toBeNull();
    });

    it('inspectStore returns null when CDP throws', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => { throw new Error('timeout'); };

      const result = await bridge.inspectStore('user');
      expect(result).toBeNull();
    });

    // --- getStoreNames ---
    it('getStoreNames returns parsed array on success', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: JSON.stringify(['user', 'cart']) },
      });

      const result = await bridge.getStoreNames();
      expect(result).toEqual(['user', 'cart']);
    });

    it('getStoreNames returns empty array when result is null', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await bridge.getStoreNames();
      expect(result).toEqual([]);
    });

    it('getStoreNames returns empty array on parse error', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: '{invalid json' },
      });

      const result = await bridge.getStoreNames();
      expect(result).toEqual([]);
    });

    // --- getStoreProperty ---
    it('getStoreProperty returns parsed value on success', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: JSON.stringify('John') },
      });

      const result = await bridge.getStoreProperty('user', 'name');
      expect(result).toBe('John');
    });

    it('getStoreProperty returns undefined when result is null', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await bridge.getStoreProperty('user', 'name');
      expect(result).toBeUndefined();
    });

    it('getStoreProperty returns raw value on parse error', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: 'not-json-but-a-string' },
      });

      const result = await bridge.getStoreProperty('user', 'name');
      expect(result).toBe('not-json-but-a-string');
    });

    // --- inspectElement ---
    it('inspectElement returns parsed data on success', async () => {
      const bridge = createConnectedBridge();
      const elemData = { selector: '#app', tag: 'div', hasContext: true, contextId: 1, data: {}, directives: [] };
      (bridge as any)._sendCDP = async () => ({
        result: { value: JSON.stringify(elemData) },
      });

      const result = await bridge.inspectElement('#app');
      expect(result).toEqual(elemData);
    });

    it('inspectElement returns null when devtools not available', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await bridge.inspectElement('#app');
      expect(result).toBeNull();
    });

    it('inspectElement returns null on parse error', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: '{bad json' },
      });

      const result = await bridge.inspectElement('#app');
      expect(result).toBeNull();
    });

    // --- getStats ---
    it('getStats returns parsed data on success', async () => {
      const bridge = createConnectedBridge();
      const stats = { contexts: 5, stores: 2, listeners: 10, refs: 3, hasRouter: true, locale: 'en' };
      (bridge as any)._sendCDP = async () => ({
        result: { value: JSON.stringify(stats) },
      });

      const result = await bridge.getStats();
      expect(result).toEqual(stats);
    });

    it('getStats returns null when devtools not available', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await bridge.getStats();
      expect(result).toBeNull();
    });

    it('getStats returns null on parse error', async () => {
      const bridge = createConnectedBridge();
      (bridge as any)._sendCDP = async () => ({
        result: { value: 'not-json' },
      });

      const result = await bridge.getStats();
      expect(result).toBeNull();
    });
  });

  // ─── evaluateExpression CDP format ─────────────────────────────────

  describe('evaluateExpression (CDP format)', () => {
    it('calls Runtime.evaluate directly without eval() or string interpolation', async () => {
      const bridge = new DevToolsBridge();
      let capturedMethod: string | null = null;
      let capturedParams: Record<string, unknown> | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async (method: string, params: Record<string, unknown>) => {
        capturedMethod = method;
        capturedParams = params;
        return { result: { type: 'number', value: 2 } };
      };

      await bridge.evaluateExpression('1 + 1');
      expect(capturedMethod).toBe('Runtime.evaluate');
      expect(capturedParams).toEqual({ expression: '1 + 1', returnByValue: true });
    });

    it('passes expression verbatim — no IIFE, no eval wrapper', async () => {
      const bridge = new DevToolsBridge();
      let capturedExpr: string | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async (_: string, params: Record<string, unknown>) => {
        capturedExpr = params.expression as string;
        return { result: { type: 'number', value: 42 } };
      };

      await bridge.evaluateExpression('21 * 2');
      expect(capturedExpr).toBe('21 * 2');
      expect(capturedExpr).not.toContain('eval(');
      expect(capturedExpr).not.toContain('function');
    });

    it('returns __error from CDP exceptionDetails', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'object', subtype: 'error' },
        exceptionDetails: {
          exception: { description: 'ReferenceError: x is not defined' },
        },
      });

      const result = await bridge.evaluateExpression('x');
      expect(result).toEqual({ __error: 'ReferenceError: x is not defined' });
    });

    it('falls back to exceptionDetails.text when exception.description is missing', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'object' },
        exceptionDetails: { text: 'Uncaught SyntaxError' },
      });

      const result = await bridge.evaluateExpression('{{bad}}');
      expect(result).toEqual({ __error: 'Uncaught SyntaxError' });
    });

    it('returns Unknown error when exceptionDetails has no text or description', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'object' },
        exceptionDetails: {},
      });

      const result = await bridge.evaluateExpression('bad');
      expect(result).toEqual({ __error: 'Unknown error' });
    });

    it('returns value directly from CDP result', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'object', value: { a: 1 } },
      });

      const result = await bridge.evaluateExpression('({a:1})');
      expect(result).toEqual({ a: 1 });
    });

    it('returns undefined when CDP result has no value', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'undefined' },
      });

      const result = await bridge.evaluateExpression('void 0');
      expect(result).toBeUndefined();
    });

    it('returns undefined when CDP response is empty', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({});

      const result = await bridge.evaluateExpression('1+1');
      expect(result).toBeUndefined();
    });

    it('returns undefined when CDP throws', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => { throw new Error('timeout'); };

      const result = await bridge.evaluateExpression('1+1');
      expect(result).toBeUndefined();
    });
  });

  // ─── _sendCDP internal ────────────────────────────────────────────

  describe('_sendCDP', () => {
    it('rejects when not connected', async () => {
      const bridge = new DevToolsBridge();
      await expect((bridge as any)._sendCDP('Runtime.evaluate', {})).rejects.toThrow('Not connected');
    });

    it('rejects when ws is null', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._ws = null;
      await expect((bridge as any)._sendCDP('Runtime.evaluate', {})).rejects.toThrow('Not connected');
    });

    it('sends JSON message via WebSocket', async () => {
      const bridge = new DevToolsBridge();
      let sentData: string | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._ws = {
        send: (data: string) => {
          sentData = data;
          // Simulate an async response
          const msg = JSON.parse(data);
          const pending = (bridge as any)._pending.get(msg.id);
          if (pending) pending.resolve({ success: true });
        },
      };

      const result = await (bridge as any)._sendCDP('Runtime.evaluate', { expression: '1+1' });
      expect(sentData).toBeTruthy();
      const parsed = JSON.parse(sentData!);
      expect(parsed.method).toBe('Runtime.evaluate');
      expect(parsed.params).toEqual({ expression: '1+1' });
      expect(result).toEqual({ success: true });
    });
  });

  // ─── _evalInPage internal ──────────────────────────────────────────

  describe('_evalInPage', () => {
    it('returns null when not connected', async () => {
      const bridge = new DevToolsBridge();
      const result = await (bridge as any)._evalInPage('1+1');
      expect(result).toBeNull();
    });

    it('returns value from CDP Runtime.evaluate', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { value: 42 },
      });

      const result = await (bridge as any)._evalInPage('21 * 2');
      expect(result).toBe(42);
    });

    it('returns null when result is undefined', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({});

      const result = await (bridge as any)._evalInPage('undefined');
      expect(result).toBeNull();
    });

    it('returns null when CDP throws', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => { throw new Error('boom'); };

      const result = await (bridge as any)._evalInPage('bad()');
      expect(result).toBeNull();
    });
  });

  // ─── _checkNoJSDevtools ────────────────────────────────────────────

  describe('_checkNoJSDevtools', () => {
    it('returns true when devtools are available', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { value: true },
      });

      const result = await (bridge as any)._checkNoJSDevtools();
      expect(result).toBe(true);
    });

    it('returns false when devtools are not available', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { value: false },
      });

      const result = await (bridge as any)._checkNoJSDevtools();
      expect(result).toBe(false);
    });

    it('returns false when CDP returns null', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { value: null },
      });

      const result = await (bridge as any)._checkNoJSDevtools();
      expect(result).toBe(false);
    });
  });

  // ─── Loopback hostname validation ─────────────────────────────────

  describe('loopback hostname validation', () => {
    it('connect rejects non-loopback host', async () => {
      const bridge = new DevToolsBridge({ host: 'evil.com', port: 9222 });
      bridge.enable();
      const result = await bridge.connect();
      expect(result).toBe(false);
    });

    it('connect allows localhost', () => {
      const bridge = new DevToolsBridge({ host: 'localhost' });
      expect((bridge as any)._isLoopback('localhost')).toBe(true);
    });

    it('connect allows 127.0.0.1', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopback('127.0.0.1')).toBe(true);
    });

    it('connect allows ::1', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopback('::1')).toBe(true);
    });

    it('connect allows [::1]', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopback('[::1]')).toBe(true);
    });

    it('rejects arbitrary hostnames', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopback('192.168.1.1')).toBe(false);
      expect((bridge as any)._isLoopback('attacker.com')).toBe(false);
      expect((bridge as any)._isLoopback('0.0.0.0')).toBe(false);
    });

    it('_isLoopbackUrl validates WebSocket URLs', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopbackUrl('ws://localhost:9222/devtools/page/abc')).toBe(true);
      expect((bridge as any)._isLoopbackUrl('ws://127.0.0.1:9222/devtools/page/abc')).toBe(true);
      expect((bridge as any)._isLoopbackUrl('ws://evil.com:9222/devtools/page/abc')).toBe(false);
      expect((bridge as any)._isLoopbackUrl('not-a-url')).toBe(false);
    });

    it('is case insensitive for localhost', () => {
      const bridge = new DevToolsBridge();
      expect((bridge as any)._isLoopback('LOCALHOST')).toBe(true);
      expect((bridge as any)._isLoopback('LocalHost')).toBe(true);
    });
  });

  // ─── Injection safety regression ──────────────────────────────────

  describe('injection safety', () => {
    it('inspectStore escapes malicious store names', async () => {
      const bridge = new DevToolsBridge();
      let capturedExpr: string | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async (_: string, params: Record<string, unknown>) => {
        capturedExpr = params.expression as string;
        return { result: { value: null } };
      };

      await bridge.inspectStore('\'; alert(1); //');
      // JSON.stringify wraps the value in quotes and escapes — verify it's escaped
      expect(capturedExpr).toContain(JSON.stringify('\'; alert(1); //'));
    });

    it('getStoreProperty escapes malicious inputs', async () => {
      const bridge = new DevToolsBridge();
      let capturedExpr: string | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async (_: string, params: Record<string, unknown>) => {
        capturedExpr = params.expression as string;
        return { result: { value: null } };
      };

      await bridge.getStoreProperty('a]); process.exit(); //', 'b.c');
      expect(capturedExpr).toContain(JSON.stringify('a]); process.exit(); //'));
    });

    it('inspectElement escapes malicious selectors', async () => {
      const bridge = new DevToolsBridge();
      let capturedExpr: string | null = null;
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async (_: string, params: Record<string, unknown>) => {
        capturedExpr = params.expression as string;
        return { result: { value: null } };
      };

      await bridge.inspectElement(')) + process.exit() + (');
      // Verify the injection attempt is safely inside a JSON.stringify'd string
      expect(capturedExpr).toContain(JSON.stringify(')) + process.exit() + ('));
    });
  });
});
