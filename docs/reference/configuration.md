# Configuration Reference

Complete reference for all No.JS LSP extension settings. Data sourced from `package.json` `contributes.configuration`.

**8 settings** across 4 groups: server tracing, validation, completion, and DevTools.

---

## All Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `nojs.trace.server` | string | `"off"` | Traces communication between VS Code and the language server |
| `nojs.validation.enabled` | boolean | `true` | Enable/disable all No.JS diagnostics |
| `nojs.completion.filters` | boolean | `true` | Show filter completions in pipe expressions |
| `nojs.customFilters` | array | `[]` | Additional custom filter names for completions |
| `nojs.customValidators` | array | `[]` | Additional custom validator names for completions |
| `nojs.devtools.enabled` | boolean | `false` | Enable live connection to a running NoJS app |
| `nojs.devtools.port` | number | `9222` | Chrome DevTools Protocol port |
| `nojs.devtools.host` | string | `"localhost"` | Chrome DevTools Protocol host |

---

## Server Tracing

### `nojs.trace.server`

- **Type:** `string` (enum: `"off"`, `"messages"`, `"verbose"`)
- **Default:** `"off"`

Traces the communication between VS Code and the No.JS language server. Useful for debugging LSP issues.

| Value | Behavior |
|-------|----------|
| `off` | No tracing (default) |
| `messages` | Log request/response messages |
| `verbose` | Log full message payloads including content |

Output appears in the **Output** panel under "No.JS LSP".

---

## Validation

### `nojs.validation.enabled`

- **Type:** `boolean`
- **Default:** `true`

Enable or disable all No.JS diagnostics. When disabled, the LSP will not report any warnings or errors for No.JS attributes.

Diagnostics include:
- Unknown directive warnings
- Invalid attribute value detection
- "Did you mean?" suggestions for typos
- Missing companion attribute hints

See [Diagnostics](../features/diagnostics.md) for details on all diagnostic rules.

---

## Completion

### `nojs.completion.filters`

- **Type:** `boolean`
- **Default:** `true`

Show filter completions when typing pipe expressions (`|`) in directive values. Disable to suppress filter suggestions.

```html
<!-- With filters enabled, typing | after an expression shows filter completions -->
<span bind="name | "></span>
<!--              ^ completions: uppercase, lowercase, capitalize, etc. -->
```

### `nojs.customFilters`

- **Type:** `array` of `string`
- **Default:** `[]`

Register additional custom filter names to include in completions. Use this when your app defines custom filters via `NoJS.filter()`.

```jsonc
// settings.json
{
  "nojs.customFilters": ["formatPhone", "maskSSN", "highlight"]
}
```

These will appear alongside the 32 built-in filters in pipe expression completions. See [Filters Reference](filters.md) for the full list of built-in filters.

### `nojs.customValidators`

- **Type:** `array` of `string`
- **Default:** `[]`

Register additional custom validator names to include in completions. Use this when your app defines custom validators via `NoJS.validator()`.

```jsonc
// settings.json
{
  "nojs.customValidators": ["phone", "zipCode", "passwordStrength"]
}
```

These will appear alongside the built-in validators in `validate` attribute completions. See [Validators Reference](validators.md) for the full list of built-in validators.

---

## DevTools

Live connection to a running No.JS application via the Chrome DevTools Protocol. When enabled, the LSP can evaluate expressions against the live app state for enhanced completions and hover information.

### `nojs.devtools.enabled`

- **Type:** `boolean`
- **Default:** `false`

Enable the live DevTools connection. Requires Chrome to be running with remote debugging enabled:

```sh
# macOS
open -a "Google Chrome" --args --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222
```

### `nojs.devtools.port`

- **Type:** `number`
- **Default:** `9222`

The Chrome DevTools Protocol port. Must match the `--remote-debugging-port` flag used when launching Chrome.

### `nojs.devtools.host`

- **Type:** `string`
- **Default:** `"localhost"`

The Chrome DevTools Protocol host. Change from `localhost` if debugging a remote browser instance.

---

## Full Example

All settings with their defaults:

```jsonc
// .vscode/settings.json
{
  // Server tracing
  "nojs.trace.server": "off",

  // Validation
  "nojs.validation.enabled": true,

  // Completion
  "nojs.completion.filters": true,
  "nojs.customFilters": [],
  "nojs.customValidators": [],

  // DevTools
  "nojs.devtools.enabled": false,
  "nojs.devtools.port": 9222,
  "nojs.devtools.host": "localhost"
}
```

Workspace-level settings in `.vscode/settings.json` override user-level settings.

---

## See Also

- [Getting Started](../getting-started.md) — installation and setup
- [Diagnostics](../features/diagnostics.md) — validation features
- [Completions](../features/completions.md) — completion features
- [Filters Reference](filters.md) — built-in filters
- [Validators Reference](validators.md) — built-in validators
