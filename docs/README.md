# No.JS LSP — Documentation

Language server for the No.JS framework — completions, hover docs, diagnostics, and more.

## Getting Started

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Installation, first steps, and configuration overview |

## Features

| Document | Description |
|----------|-------------|
| [Completions](features/completions.md) | Directive, filter, validator, animation, and context key completions |
| [Hover](features/hover.md) | Inline documentation on hover for directives, filters, and context keys |
| [Diagnostics](features/diagnostics.md) | Validation warnings, unknown directives, orphaned else, and "did you mean?" suggestions |
| [Go-to-Definition](features/go-to-definition.md) | Jump to template, ref, or store declarations |
| [References](features/references.md) | Find all usages of templates, refs, and stores across the document |
| [Symbols](features/symbols.md) | Document symbol outline for state, stores, refs, templates, and routes |
| [Semantic Highlighting](features/semantic-highlighting.md) | Syntax highlighting for directive names, filters, stores, and loop variables |
| [Code Actions](features/code-actions.md) | Quick fixes for missing `as`, directive typos, and more |
| [Inlay Hints](features/inlay-hints.md) | Loop variable and HTTP method hints |
| [Links](features/links.md) | Clickable URLs in HTTP directives and template `src` paths |
| [Snippets](features/snippets.md) | Built-in snippets for common No.JS patterns |

## Reference

| Document | Description |
|----------|-------------|
| [Directives](reference/directives.md) | All 39+ supported directives with categories and companions |
| [Filters](reference/filters.md) | All 32 built-in filters with arguments and descriptions |
| [Validators](reference/validators.md) | Built-in form validators |
| [Context Keys](reference/context-keys.md) | `$store`, `$refs`, `$route`, `$router`, `$i18n`, `$form` |
| [Animations](reference/animations.md) | Built-in animation names for transitions |
| [Configuration](reference/configuration.md) | All `nojs.*` settings and their defaults |

## Advanced

| Document | Description |
|----------|-------------|
| [Workspace Scanner](advanced/workspace-scanner.md) | How the LSP scans for routes, stores, custom directives, and i18n keys |
| [DevTools Bridge](advanced/devtools-bridge.md) | Live connection to a running No.JS app via Chrome DevTools Protocol |
| [Expression Analyzer](advanced/expression-analyzer.md) | Expression syntax validation internals |

## Development

| Document | Description |
|----------|-------------|
| [Architecture](development/architecture.md) | Extension and server structure overview |
| [Adding a Directive](development/adding-a-directive.md) | How to register a new directive in the LSP |
| [Adding a Filter](development/adding-a-filter.md) | How to add a new filter to completions and hover |
| [Adding a Provider](development/adding-a-provider.md) | How to implement a new LSP feature provider |
| [Testing](development/testing.md) | Running and writing unit tests |
