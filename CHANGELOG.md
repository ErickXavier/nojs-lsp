# Changelog

All notable changes to the **No.JS LSP** extension will be documented in this file.

## [0.2.0] — 2025-07-13

### Added

#### DevTools Bridge (Phase 5)
- Chrome DevTools Protocol (CDP) client for live NoJS runtime integration
- Live expression evaluation: `$store` hover shows live connection indicator when DevTools are connected
- Auto-discovery of NoJS pages via CDP target listing and `__NOJS_DEVTOOLS__` detection
- Runtime API integration: `inspectStore()`, `getStoreNames()`, `getStoreProperty()`, `inspectElement()`, `getStats()`, `evaluateExpression()`
- Configuration: `nojs.devtools.enabled`, `nojs.devtools.port`, `nojs.devtools.host`
- 20 new unit tests (DevTools bridge + hover integration)

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
