# No.JS LSP

VS Code extension providing full language server support for the [No.JS](https://github.com/ErickXavier/no-js) HTML-first reactive framework.

## Features

### Completions
- **Directive completions** — All 36+ No.JS directives (`state`, `if`, `get`, `each`, `model`, etc.)
- **Dynamic directives** — `bind-*`, `on:*`, `class-*`, `style-*` with common targets/events
- **Companion attributes** — Context-aware: shows `as`, `loading`, `error` only when `get` is present
- **Event modifiers** — `.prevent`, `.stop`, `.once`, `.debounce`, `.throttle`, key modifiers
- **Filter completions** — All 32 built-in filters after `|` in expressions
- **Filter argument hints** — Shows argument name, type, and defaults after `:`
- **Validator completions** — Built-in validators for `validate` attribute
- **Animation completions** — All built-in animation names
- **Context keys** — `$store`, `$refs`, `$route`, `$router`, `$i18n`, `$form`
- **i18n key completions** — Scans `locales/` for translation keys and suggests them in `t="..."` attributes
- **Route completions** — Scans `pages/` directory for file-based routes
- **Store property completions** — Parses `store` declarations to suggest `$store.name.prop`
- **Template var completions** — Suggests `var-*` attributes matching template slot declarations
- **Custom directive completions** — Detects `NoJS.directive()` calls in workspace JS files

### Hover Documentation
- Directive purpose, syntax, and examples
- Companion attribute descriptions
- Filter documentation with arguments
- Context key (`$store`, `$refs`) and loop variable (`$index`, `$count`) descriptions

### Diagnostics
- Unknown directive warnings (with "did you mean?" suggestions)
- Orphaned `else` / `else-if` detection
- Unknown filter warnings
- Empty required values
- Invalid event modifiers
- Duplicate state declarations
- Duplicate `ref` names
- Template ID referenced but not defined
- Missing `as` for HTTP directives
- Expression syntax validation
- `model` on non-form elements

### Go-to-Definition
- `use="id"` → jump to `<template id="id">`
- `$refs.name` → jump to `ref="name"` element
- `$store.name` → jump to `store` declaration
- Template-referencing attributes (`then`, `else`, `loading`, `error`, `empty`, `success`)

### Find References
- Find all usages of a template ID across the document
- Find all references to a ref name (`$refs.x` ↔ `ref="x"`)
- Find all store accesses (`$store.x` ↔ `store`)

### Document Symbols
- `state` → Variable, `store` → Module, `ref` → Field
- `<template id>` → Class, `route-view` → Namespace
- `computed` → Property, `watch` → Event, HTTP methods → Function

### Document Links
- HTTP directive URLs as clickable links
- Template `src` and `route-view src` as file/directory links

### Semantic Highlighting
- Directive names → keyword
- Dynamic prefixes (`bind-`, `on:`, `class-`, `style-`) → decorator
- Filter names → function, pipe `|` → operator
- Store references → variable.readonly
- Loop context vars → variable.builtin

### Code Actions
- Quick fix: add missing `as` for HTTP directives
- Quick fix: "did you mean?" for typos in directive names

### Inlay Hints
- Loop variable names for `each` (`→ $index, $count, $first, $last`)
- HTTP method badge for `get`/`post`/`put`/`patch`/`delete` with `as`

### Snippets
- 15 built-in snippets for common patterns (`nojs-if`, `nojs-each`, `nojs-get`, `nojs-store`, `nojs-form`, etc.)

## Installation

### VS Code
Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=exs.nojs-lsp).

Or install from `.vsix`:
```bash
code --install-extension nojs-lsp-*.vsix
```

### Other Editors

Install the standalone language server:

```bash
npm install -g @erickxavier/nojs-language-server
```

Then configure your editor's LSP client to use `nojs-language-server --stdio`.

#### Neovim (nvim-lspconfig)

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

configs.nojs = {
  default_config = {
    cmd = { 'nojs-language-server', '--stdio' },
    filetypes = { 'html' },
    root_dir = lspconfig.util.root_pattern('package.json', '.git'),
  },
}

lspconfig.nojs.setup({})
```

#### Sublime Text (LSP package)

Install the [LSP](https://github.com/sublimelsp/LSP) package, then add to **Settings → LSP Settings**:

```json
{
  "clients": {
    "nojs": {
      "enabled": true,
      "command": ["nojs-language-server", "--stdio"],
      "selector": "text.html"
    }
  }
}
```

#### Emacs (eglot)

```elisp
(with-eval-after-load 'eglot
  (add-to-list 'eglot-server-programs
               '(html-mode . ("nojs-language-server" "--stdio"))))
```

Or with `lsp-mode`:

```elisp
(lsp-register-client
 (make-lsp-client
  :new-connection (lsp-stdio-connection '("nojs-language-server" "--stdio"))
  :major-modes '(html-mode mhtml-mode)
  :server-id 'nojs-ls))
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `nojs.validation.enabled` | `true` | Enable/disable all No.JS diagnostics |
| `nojs.completion.filters` | `true` | Show filter completions in pipe expressions |
| `nojs.customFilters` | `[]` | Additional custom filter names for completions |
| `nojs.customValidators` | `[]` | Additional custom validator names for completions |
| `nojs.trace.server` | `"off"` | Trace communication between client and server |

## Development

```bash
# Install dependencies
npm install

# Build
npm run compile

# Run tests
npm test

# Package extension
npm run package
```

## License

MIT © [Erick Xavier](https://github.com/ErickXavier)
