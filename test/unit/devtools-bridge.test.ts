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
  });

  it('creates with custom options', () => {
    const bridge = new DevToolsBridge({ port: 9333, host: '127.0.0.1' });
    expect(bridge.connected).toBe(false);
    expect(bridge.targetUrl).toBeNull();
  });

  it('creates with partial options', () => {
    const bridge = new DevToolsBridge({ port: 9333 });
    expect(bridge.connected).toBe(false);
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

    it('returns value directly from CDP result', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => ({
        result: { type: 'object', value: { a: 1 } },
      });

      const result = await bridge.evaluateExpression('({a:1})');
      expect(result).toEqual({ a: 1 });
    });

    it('returns undefined when CDP throws', async () => {
      const bridge = new DevToolsBridge();
      (bridge as any)._connected = true;
      (bridge as any)._sendCDP = async () => { throw new Error('timeout'); };

      const result = await bridge.evaluateExpression('1+1');
      expect(result).toBeUndefined();
    });
  });

  // ─── Loopback hostname validation ─────────────────────────────────

  describe('loopback hostname validation', () => {
    it('connect rejects non-loopback host', async () => {
      const bridge = new DevToolsBridge({ host: 'evil.com', port: 9222 });
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
