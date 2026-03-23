# Getting Started

The **No.JS LSP** extension adds language server support for the [No.JS](https://github.com/ErickXavier/no-js) HTML-first reactive framework in VS Code. It provides completions, hover documentation, diagnostics, go-to-definition, and more — all activated automatically when you open an HTML file.

## Installation

### VS Code Marketplace

1. Open VS Code.
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for `No.JS LSP`.
4. Click **Install**.

The extension ID is `EXS.nojs-lsp`.

You can also install from the command line:

```sh
code --install-extension EXS.nojs-lsp
```

### Manual VSIX Install

If you have a `.vsix` file (e.g., from a pre-release build):

```sh
code --install-extension nojs-lsp-1.10.0.vsix
```

Or in VS Code: **Extensions** → **⋯** menu → **Install from VSIX…**

## First Steps

The extension activates automatically on any HTML file. No configuration is required.

1. **Open an HTML file** in VS Code.
2. **Start typing a No.JS attribute** — `state=`, `bind-`, `on:`, `if=`, `each=`, `get=`, etc.
3. **Observe completions** appearing with directive names, descriptions, and companion attributes.

<!-- screenshot: completion-popup.png -->

4. **Hover over a directive** to see inline documentation with syntax and examples.

<!-- screenshot: hover-docs.png -->

5. **Save the file** to trigger diagnostics — the extension highlights unknown directives, orphaned `else` blocks, missing `as` attributes, and more.

### Trigger Characters

Completions are triggered automatically when you type any of these characters:

| Character | Context |
|-----------|---------|
| `-` | Dynamic directives: `bind-`, `class-`, `style-` |
| `:` | Event bindings: `on:click`, `on:submit` |
| `.` | Event modifiers: `.prevent`, `.stop`, `.once` |
| `\|` | Filters in expressions: `name \| uppercase` |
| `$` | Context keys: `$store`, `$refs`, `$route` |
| `=` | Attribute values |
| `"` `'` | Inside attribute values |

## Configuration

All settings are under the `nojs.*` namespace. Defaults work out of the box — adjust only as needed.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `nojs.trace.server` | `string` | `"off"` | Traces communication between VS Code and the language server. Values: `off`, `messages`, `verbose`. |
| `nojs.validation.enabled` | `boolean` | `true` | Enable or disable all No.JS diagnostics. |
| `nojs.completion.filters` | `boolean` | `true` | Show filter completions in pipe expressions. |
| `nojs.customFilters` | `string[]` | `[]` | Additional custom filter names to include in completions. |
| `nojs.customValidators` | `string[]` | `[]` | Additional custom validator names to include in completions. |
| `nojs.devtools.enabled` | `boolean` | `false` | Enable live connection to a running No.JS app via Chrome DevTools Protocol. |
| `nojs.devtools.port` | `number` | `9222` | Chrome DevTools Protocol port. |
| `nojs.devtools.host` | `string` | `"localhost"` | Chrome DevTools Protocol host. |

For full details, see [Configuration](reference/configuration.md).

## Key Features

- **[Completions](features/completions.md)** — 39+ directives, 32 filters, validators, animations, context keys, i18n keys, routes, and store properties.
- **[Hover](features/hover.md)** — Inline docs with syntax, examples, and companion attribute descriptions.
- **[Diagnostics](features/diagnostics.md)** — Unknown directive warnings with "did you mean?" suggestions, orphaned `else` detection, expression validation, and more.
- **[Go-to-Definition](features/go-to-definition.md)** — Jump to `<template>` definitions, `ref` declarations, and `store` sources.
- **[Semantic Highlighting](features/semantic-highlighting.md)** — Distinct colors for directive names, filters, stores, and loop variables.
- **[Snippets](features/snippets.md)** — 23 built-in snippets for common patterns like `if`/`else`, `each`, `get`, `store`, and `form`.

See the full [documentation index](README.md) for all features.
