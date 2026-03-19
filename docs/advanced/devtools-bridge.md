# DevTools Bridge

The DevTools Bridge provides a live connection between the No.JS LSP and a running No.JS application in Chrome or Edge. It uses the Chrome DevTools Protocol (CDP) to evaluate expressions in the page's runtime, enabling features like live store inspection and augmented hover data directly in your editor.

Source: [`server/src/devtools-bridge.ts`](../../server/src/devtools-bridge.ts)

---

## Setup

### 1. Enable in VS Code Settings

The bridge is disabled by default. Add these settings to your `settings.json`:

```json
{
  "nojs.devtools.enabled": true,
  "nojs.devtools.port": 9222,
  "nojs.devtools.host": "localhost"
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `nojs.devtools.enabled` | boolean | `false` | Enable the DevTools Bridge |
| `nojs.devtools.port` | number | `9222` | CDP remote debugging port |
| `nojs.devtools.host` | string | `"localhost"` | CDP host (loopback only) |

See [Configuration Reference](../reference/configuration.md) for all extension settings.

### 2. Launch Chrome with Remote Debugging

Start Chrome or Edge with the `--remote-debugging-port` flag:

```sh
# Chrome
google-chrome --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Edge
msedge --remote-debugging-port=9222
```

### 3. Open Your No.JS App

Navigate to your No.JS application in the browser. The bridge will automatically discover and connect to a page tab that exposes `window.__NOJS_DEVTOOLS__`.

---

## Connection Flow

When `nojs.devtools.enabled` is `true`, the LSP server manages the bridge lifecycle on configuration changes:

```
settings change → devtools.enabled?
                      ↓ yes
              ┌───────────────────────────────────┐
              │  GET http://<host>:<port>/json     │  ← list CDP targets
              │  Filter targets where type="page"  │
              │  Validate WebSocket URL (loopback) │
              └───────────────────────────────────┘
                      ↓
              ┌───────────────────────────────────┐
              │  For each page target:             │
              │    1. Open WebSocket connection     │
              │    2. Check __NOJS_DEVTOOLS__       │
              │    3. If found → stay connected     │
              │    4. If not → disconnect, try next │
              └───────────────────────────────────┘
                      ↓
              ┌───────────────────────────────────┐
              │  Fallback: connect to first page   │
              │  with a valid loopback WS URL      │
              └───────────────────────────────────┘
```

The bridge reconnects automatically when the port or host settings change. If `nojs.devtools.enabled` is set to `false`, the bridge disconnects and is destroyed.

**Timeouts:**
- Target list HTTP request: 3 seconds
- WebSocket connection: 5 seconds
- Individual CDP requests: 5 seconds

---

## Security

The bridge enforces **loopback-only connections** to prevent unintended access to remote browsers.

### Loopback Validation

The `_isLoopback()` check restricts the host setting to local addresses only:

| Allowed Values |
|----------------|
| `localhost` |
| `127.0.0.1` |
| `::1` |
| `[::1]` |

Any other host value causes `connect()` to return `false` immediately — no network request is made.

### WebSocket URL Validation

Before opening a WebSocket to a CDP target, `_isLoopbackUrl()` parses the `webSocketDebuggerUrl` and verifies that its hostname is also a loopback address. Targets with non-loopback WebSocket URLs are skipped.

### Expression Safety

Methods like `inspectStore()`, `getStoreProperty()`, and `inspectElement()` use `JSON.stringify()` to safely interpolate user-provided arguments into evaluation expressions, preventing injection into the CDP `Runtime.evaluate` call.

The `evaluateExpression()` method passes expressions verbatim to CDP — this mirrors standard DevTools console behavior where the user executes their own code in their own browser page.

---

## Public API

### `inspectStore(name)`

Inspects a named store's data via `window.__NOJS_DEVTOOLS__.inspectStore()`.

- **Parameter:** `name` — store name (string)
- **Returns:** `LiveStoreData | null`

```ts
interface LiveStoreData {
  name: string;
  data: Record<string, unknown> | null;
  contextId?: number;
}
```

### `getStoreNames()`

Returns the names of all registered stores by reading `Object.keys(window.__NOJS_DEVTOOLS__.stores)`.

- **Returns:** `string[]` (empty array if DevTools unavailable)

### `getStoreProperty(store, path)`

Reads a specific property from a store using dot-notation traversal.

- **Parameters:**
  - `store` — store name (string)
  - `path` — dot-separated property path (string), e.g. `"user.profile.name"`
- **Returns:** the property value, or `undefined` if not found

### `inspectElement(selector)`

Inspects a DOM element's No.JS context via `window.__NOJS_DEVTOOLS__.inspect()`.

- **Parameter:** `selector` — CSS selector (string)
- **Returns:** `LiveElementInfo | null`

```ts
interface LiveElementInfo {
  selector: string;
  tag: string;
  hasContext: boolean;
  contextId: number | null;
  data: Record<string, unknown> | null;
  directives: Array<{ name: string; value: string }>;
}
```

### `getStats()`

Returns runtime statistics from `window.__NOJS_DEVTOOLS__.stats()`.

- **Returns:** `LiveStats | null`

```ts
interface LiveStats {
  contexts: number;
  stores: number;
  listeners: number;
  refs: number;
  hasRouter: boolean;
  locale: string;
}
```

### `evaluateExpression(expr)`

Evaluates an arbitrary JavaScript expression in the page context via CDP `Runtime.evaluate`.

- **Parameter:** `expr` — JavaScript expression (string)
- **Returns:** the evaluated value, `{ __error: string }` on exception, or `undefined` if disconnected

---

## Hover Integration

When the bridge is connected, the [hover provider](../features/hover.md) augments `$store` references with live data indicators.

The LSP server passes `getDevToolsBridge` as a factory function to the hover handler:

```ts
connection.onHover(onHover(documents, getDevToolsBridge));
```

When the cursor hovers over a `$store.name.property` expression, the hover provider:

1. Checks if the bridge is connected via `getBridge()`
2. Extracts the store name and property path from the expression
3. Appends a live-data indicator to the standard `$store` hover documentation

The result appears as an additional section below the static documentation:

```
⚡ Live — store user.profile (DevTools connected)
```

This lets you confirm at a glance that the bridge is active and which store is being referenced, without leaving the editor.

---

## Singleton Management

The bridge is managed as a singleton with three module-level functions:

| Function | Description |
|----------|-------------|
| `createDevToolsBridge(options?)` | Creates a new bridge instance (disconnects any existing one) |
| `getDevToolsBridge()` | Returns the current bridge instance, or `null` |
| `destroyDevToolsBridge()` | Disconnects and removes the bridge instance |

The LSP server calls these in `onDidChangeConfiguration` to create, replace, or destroy the bridge whenever the `nojs.devtools.*` settings change.
