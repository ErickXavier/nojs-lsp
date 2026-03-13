# Changelog

All notable changes to the **No.JS LSP** extension will be documented in this file.

## [0.3.0](https://github.com/ErickXavier/nojs-lsp/compare/v0.2.0...v0.3.0) — 2026-03-13

### Added
- `validate-on` value completions (`input`, `blur`, `focusout`, `submit`) ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- `$form.` sub-property completions for all 11 properties (`valid`, `dirty`, `touched`, `pending`, `submitting`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()`) ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- `$rule` context variable hover documentation and semantic token highlighting ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- `error-class`, `validate-on`, `validate-if` HTML attribute intellisense ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- Native ValidityState validators: `minlength`, `maxlength`, `pattern`, `step` ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))

### Changed
- Updated `validate` directive companions and documentation for pristine-aware errors ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- Updated `$form` hover docs with all new properties ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))
- Updated form snippet with new validation pattern ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))

### Removed
- Obsolete built-in validators: `between`, `match`, `phone`, `cpf`, `cnpj`, `creditcard` ([`8c67713`](https://github.com/ErickXavier/nojs-lsp/commit/8c67713))

## [0.2.0](https://github.com/ErickXavier/nojs-lsp/compare/v0.1.0...v0.2.0) — 2026-03-13

### Added

#### DevTools Bridge (Phase 5)
- Chrome DevTools Protocol (CDP) client for live NoJS runtime integration
- Live expression evaluation: `$store` hover shows live connection indicator when DevTools are connected
- Auto-discovery of NoJS pages via CDP target listing and `__NOJS_DEVTOOLS__` detection
- Runtime API integration: `inspectStore()`, `getStoreNames()`, `getStoreProperty()`, `inspectElement()`, `getStats()`, `evaluateExpression()`
- Configuration: `nojs.devtools.enabled`, `nojs.devtools.port`, `nojs.devtools.host`

#### Directive Data Enhancements
- Promoted `case` and `default` from `switch` child attributes to top-level directives with own documentation
- Added `error` and `success` companion attributes to `validate` directive
- Added `lazy` and `outlet` companion attributes to `route` directive
- Added `drop-sort` value completions (`vertical`, `horizontal`, `grid`)

#### Hover & Semantic Tokens
- Added hover documentation for `$watch`, `$notify`, `$set` context variables
- Added `$error` to semantic token context variables

### Changed
- Simplified all snippet prefixes to bare directive names (e.g. `nojs-if` → `if`)
- Updated README development section

### Removed
- Removed old Mocha-based e2e test infrastructure
- Removed unused devDependencies (`mocha`, `@types/mocha`, `glob`, `@types/glob`)

## [0.1.0] — 2025-07-10

### Added

#### Core (Phase 1)
- Full IntelliSense for all 36+ No.JS directives with documentation
- Dynamic directive completions (`bind-*`, `on:*`, `class-*`, `style-*`)
- Context-aware companion attribute completions
- Event modifier completions (`.prevent`, `.stop`, `.once`, `.debounce`, etc.)
- Filter completions and argument hints (32 built-in filters)
- Validator completions (12 built-in validators)
- Animation name completions
- Context key completions (`$store`, `$refs`, `$route`, etc.)
- Hover documentation for directives, filters, context keys, and loop variables
- Diagnostics: unknown directives, orphaned else/else-if, unknown filters, empty values, invalid modifiers, duplicate state

#### Advanced (Phase 2)
- Go-to-Definition: `use` → template, `$refs` → ref element, `$store` → store declaration
- Find References: template IDs, ref names, store accesses
- Document Symbols: state, store, ref, template, route-view, computed, watch, HTTP methods
- Document Links: HTTP directive URLs, template src, route-view src
- Semantic Tokens: directive names, dynamic prefixes, filters, pipe operators, store refs, loop vars
- Enhanced Diagnostics: expression syntax validation, unknown validators, model on non-form elements, duplicate refs, undefined template IDs, missing `as`
- Expression Analyzer: pipe syntax parsing, syntax error detection

#### DX Polish (Phase 3)
- Code Actions: add missing `as` for HTTP directives, "did you mean?" typo suggestions
- Inlay Hints: loop variable names for `each`, HTTP method badges
- 15 built-in snippets for common patterns
- Configuration: `nojs.validation.enabled`, `nojs.completion.filters`, `nojs.customFilters`, `nojs.customValidators`

#### Ecosystem Integration (Phase 4)
- i18n key completions: scans `locales/` for translation keys
- Route path completions: scans `pages/` directory for file-based routes
- Store property completions: parses store declarations for `$store.name.prop`
- Template var completions: suggests `var-*` attributes for template slots
- Custom directive detection: reads `NoJS.directive()` calls from workspace JS files
- Workspace file scanner with caching and auto-invalidation

#### Infrastructure
- VS Code extension with Language Server Protocol (LSP 3.17)
- Standalone server for Neovim, Sublime Text, Emacs, and other editors (`--stdio`)
- Custom HTML Data for basic completions without LSP
- GitHub Actions CI/CD for testing and publishing
- 199 unit tests across 15 suites
