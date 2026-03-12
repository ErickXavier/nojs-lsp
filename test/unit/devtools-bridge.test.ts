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
});
