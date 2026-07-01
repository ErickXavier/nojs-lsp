# Changelog

All notable changes to the **No.JS LSP** extension will be documented in this file.

## [Unreleased](https://github.com/no-js-dev/nojs-lsp/compare/v1.16.0...HEAD)

## [1.16.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.6...v1.16.0) — 2026-07-01

### Changed

- Version aligned with the NoJS ecosystem release. (No i18n config-key completions yet — tracked separately as LSP-38.)

## [1.15.6](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.5...v1.15.6) — 2026-06-25

### Changed

- Ecosystem version bump to sync with core v1.15.6

## [1.15.5](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.4...v1.15.5) — 2026-06-24

### Fixed

- fix(data): remove incorrect `source` property from error-boundary CustomEvent detail in nojs-custom-data.json (core only dispatches `{ message, error }`)
- fix(docs): update snippet count from 23 to 41 and directive count from 44 to 45 in llms.txt
- fix(docs): sync docs with core, remove CLI references

### Changed

- docs(data): expand error-boundary documentation with `nojs:error` CustomEvent detail shape and `on:error` companion
- docs(data): add `$i18n.[path]` reactive proxy documentation to `t` directive
- docs(reference): document `on:error` companion and `nojs:error` CustomEvent for error-boundary in directives.md
- docs(reference): document `$i18n.[path]` reactive proxy in `t` directive section of directives.md

## [1.15.4](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.3...v1.15.4) — 2026-06-22

### Fixed

- fix(docs): replace jsDelivr badge with VS Code Marketplace badges
- fix(docs): add Installation section to README (Marketplace, CLI, VSIX)
- fix(docs): update snippet count from 31/23 to 41 across README and docs
- fix(docs): update directive count from 39/40 to 45 across README and docs

## [1.15.3](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.2...v1.15.3) — 2026-06-20

### Changed

- chore(deps): upgrade TypeScript to 6.x
- chore(deps): upgrade vscode-languageserver to 10.x
- chore(deps): upgrade vscode-languageclient to 10.x
- chore(deps): require Node.js >= 20.0.0

### Fixed

- fix(types): adapt code-actions provider and tests for `Diagnostic.message` type change in vscode-languageserver 10.x (`string | MarkupContent`)

## [1.15.2] - 2026-06-20

### Fixed
- fix(build): ensure all dist files contain correct version on release

## [1.15.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.15.0...v1.15.1) — 2026-06-20

### Fixed

- chore(docs): fix README.md badges and miscellaneous documentation files

## [1.15.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.14.1...v1.15.0) — 2026-06-19

### Added

- `feat(i18n): add $i18n reactive proxy completions and snippets`

### Changed

- **BREAKING (Core v1.15 sync):** Sibling `else` after loop directives (`each`/`foreach`/`for`) is no longer valid — diagnostics now report it as an error and suggest the `else="templateId"` companion instead
- `else="templateId"` companion on loop elements no longer triggers a false "orphaned else" diagnostic
- Template ID references (`else`, `then`, `use`, `template`, etc.) now accept the `#id` form in addition to the bare id
- Loop directive docs, hovers, and the `else` directive docs updated with v1.15 empty-state semantics: the else template renders when the list is empty (`[]`) or null/undefined/not an array

## [1.14.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.14.0...v1.14.1) — 2026-06-11

### Fixed

- Fixed `route` snippet: changed `<route-view>` element to `<div route-view>` attribute selector
- Removed all `bind-text` references from snippets (text binding is plain `bind`)
- Added standalone `animate` directive entry to directives.json
- Added 8 HTTP pagination attributes to nojs-custom-data.json
- Marked `from` loop companion as deprecated in custom-data
- Removed phantom filter arguments (truncate.suffix, sortBy.direction, number/currency.locale, datetime.format)
- Added head directives and pagination companions to docs/reference/directives.md
- Fixed filter examples in docs/reference/filters.md (each syntax, phantom args)
- Fixed `date` filter entry in filters.json: renamed phantom `format` arg to `fmt`, added `short` default, corrected `YYYY-MM-DD` example to `date:'long'`

## [1.14.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.13.3...v1.14.0) — 2026-06-09

### Added

- 7 new companion attributes for `get` directive: `get-trigger`, `get-trigger-label`, `get-insert`, `get-page`, `get-cursor`, `get-cursor-field`, `get-threshold`
- 5 new VS Code snippets: Infinite Scroll, Load More Button, Cursor Pagination, Lazy Load on Visible, Hover Prefetch

## [1.13.3](https://github.com/no-js-dev/nojs-lsp/compare/v1.13.2...v1.13.3) — 2026-06-05

### Changed

- Version sync with NoJS ecosystem 1.13.3.

## [1.13.2](https://github.com/no-js-dev/nojs-lsp/compare/v1.13.1...v1.13.2) — 2026-06-02

### Changed

- Version sync with NoJS ecosystem 1.13.2.

## [1.13.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.13.0...v1.13.1) — 2026-06-01

### Fixed

- Derive the "Requires `@no-js-dev/nojs-elements` plugin" note from the `.plugin` field in hover/completion documentation — previously the `.plugin` field was inert dead metadata and the requirement text was hand-duplicated across doc strings, so the field is now the single source of truth
- Companion attributes now inherit the plugin requirement from their parent directive instead of needing it re-declared
- Fixed literal `\\n` newline escaping in `nojs-custom-data.json` that broke hover rendering for `validate`, `error-class`, `validate-on`, and `validate-if`

## [1.13.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.12.0...v1.13.0) — 2026-06-01

### Changed

- DnD (`drag`, `drop`, `drag-list`, `drag-multiple`) and `validate` metadata now mark these directives as requiring the `@no-js-dev/nojs-elements` plugin (`NoJS.use(NoJSElements)`), surfaced in hover/completion documentation as of NoJS v1.13.0

## [1.12.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.11.1...v1.12.0) — 2026-05-21

### Changed

- Consolidated docs CSS design system to match Core (`--primary`, `--text`, `--border` variable names)
- Aligned header with Core/Elements pattern — added "More" ecosystem dropdown (Popover API), Discord icon, reordered nav items
- Aligned footer with Core design — replaced links layout with `footer-cols`, removed "Powered by" badge, use Core's SVG logo
- Removed `filter: brightness(0) invert(1)` from inline SVG footer logo
- Switched favicon from `logo.png` to `favicon.ico` (matching Core)
- Version bump for ecosystem sync with NoJS v1.12.0

## [1.11.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.11.0...v1.11.1) — 2026-05-20

### Changed

- Removed NoJS-MCP references from docs and README

## [1.11.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.10.1...v1.11.0) — 2026-03-26

### Added

- Plugin snippets and TypeScript type reference for the plugin system ([`d469a76`](https://github.com/no-js-dev/nojs-lsp/commit/d469a76))
- Head management directives (`page-title`, `page-description`, `page-canonical`, `page-jsonld`) completions, hover, and diagnostics ([`27ccc63`](https://github.com/no-js-dev/nojs-lsp/commit/27ccc63))
- `focusBehavior` config option support ([`27ccc63`](https://github.com/no-js-dev/nojs-lsp/commit/27ccc63))
- GitHub Actions CI workflow and VS Code Marketplace publishing automation ([`2fa1bcd`](https://github.com/no-js-dev/nojs-lsp/commit/2fa1bcd))

### Fixed

- Add `persist-fields` and `persist-schema` to state companions ([`ee45e6f`](https://github.com/no-js-dev/nojs-lsp/commit/ee45e6f))

## [1.10.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.10.0...v1.10.1) — 2026-03-23

### Fixed

- Sync LSP directive data and documentation with NoJS v1.10.1 security hardening changes ([`4f7b29a`](https://github.com/no-js-dev/nojs-lsp/commit/4f7b29a))

## [1.10.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.9.1...v1.10.0) — 2026-03-23

### Fixed

- Sync LSP directive data with framework source code (persist-fields, $even/$odd inlay hints)

### Added

- `llms.txt`, `sitemap.xml`, and inline LLM metadata for AI discoverability
- Documentation site with getting-started guide, roadmap, and OG metadata
- Custom domain (CNAME) for `lsp.no-js.dev`
- `foreach` directive support improvements in completions and diagnostics

## [1.9.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.9.0...v1.9.1) — 2026-03-18

### Added

- Updated `foreach` documentation in `directives.json` and `nojs-custom-data.json` to document inline templates
- 3 new `foreach` snippets: inline, external template, filter/sort
- Fixed `foreach` inlay hint to show `$first`, `$last` alongside `$index`, `$count`
- 4 `foreach` examples in test fixtures
- 6 new tests across completion, hover, diagnostics, and inlay-hints

## [1.9.0](https://github.com/no-js-dev/nojs-lsp/compare/v1.8.2...v1.9.0) — 2026-03-17

### Added

- Loopback-only hostname validation for CDP connections (defense-in-depth against SSRF)
- WebSocket URL loopback validation for CDP targets
- JSDoc security contracts on `evaluateExpression()` and `_evalInPage()`
- 10 new tests: hostname validation (loopback allow/deny) and injection-safety regression

### Changed

- Replace `new Function()` in `expression-analyzer.ts` with bracket/string balance validation

## [1.8.2](https://github.com/no-js-dev/nojs-lsp/compare/v1.8.1...v1.8.2) — 2026-03-17

### Changed
- Version bump to match No.JS framework v1.8.2 (memory leak fixes, no LSP changes required)

## [1.8.1](https://github.com/no-js-dev/nojs-lsp/compare/v1.8.0...v1.8.1) — 2026-03-17

### Changed
- `i18n-ns` no longer requires a value — supports auto-detection from route template when used on `route-view`
- Updated `i18n-ns` documentation in `directives.json` and `nojs-custom-data.json`
- Updated README to reflect 39+ directives, 20 snippets, and wildcard route support
- Added diagnostic test for valueless `i18n-ns` attribute
- Added "study codebase" step to release and sync agent instructions
- Added git tagging step to release agent flow

## [1.8.0](https://github.com/no-js-dev/nojs-lsp/compare/v0.3.1...v1.8.0) — 2026-03-16

### Added
- LSP support for `route="*"` wildcard catch-all — completions, diagnostics, hover ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- Duplicate wildcard route detection per outlet (diagnostics warning) ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- Rich hover for `route="*"` explaining fallback chain and `$route.matched` ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- `nojs-route-404` snippet for 404 catch-all template ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- `call` and `call-confirm` snippets ([`8df9c61`](https://github.com/no-js-dev/nojs-lsp/commit/8df9c61))
- `NoJS.notify()` snippet (prefix: `notify`) for external store mutation pattern ([`a79b209`](https://github.com/no-js-dev/nojs-lsp/commit/a79b209))
- Copilot project guidelines (`.github/copilot-instructions.md`) ([`d70f90c`](https://github.com/no-js-dev/nojs-lsp/commit/d70f90c))

### Changed
- Updated `call` directive companions in `directives.json` — added `loading`, `redirect`, `headers` ([`8df9c61`](https://github.com/no-js-dev/nojs-lsp/commit/8df9c61))
- Updated `as` default description to note default `"data"` for `call` ([`8df9c61`](https://github.com/no-js-dev/nojs-lsp/commit/8df9c61))
- Updated `nojs-custom-data.json` descriptions for `call`, `as`, `loading`, `redirect`, `headers` ([`8df9c61`](https://github.com/no-js-dev/nojs-lsp/commit/8df9c61))
- Updated `$route` context key docs to include `matched` property ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- Updated `directives.json` route documentation with wildcard usage ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- Updated `nojs-custom-data.json` route description with catch-all example ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))
- Skip expression syntax validation for `route` attribute values ([`73629f2`](https://github.com/no-js-dev/nojs-lsp/commit/73629f2))

## [0.3.1](https://github.com/no-js-dev/nojs-lsp/compare/v0.3.0...v0.3.1) — 2026-03-14

### Fixed
- Fix server crash caused by `vscode-html-languageservice` UMD bundle using dynamic `require()` calls that fail at runtime (`Cannot find module './parser/htmlScanner'`)
- Add `mainFields: ['module', 'main']` to esbuild server config to prefer ESM entry points

## [0.3.0](https://github.com/no-js-dev/nojs-lsp/compare/v0.2.0...v0.3.0) — 2026-03-13

### Added
- `validate-on` value completions (`input`, `blur`, `focusout`, `submit`) ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- `$form.` sub-property completions for all 11 properties (`valid`, `dirty`, `touched`, `pending`, `submitting`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()`) ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- `$rule` context variable hover documentation and semantic token highlighting ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- `error-class`, `validate-on`, `validate-if` HTML attribute intellisense ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- Native ValidityState validators: `minlength`, `maxlength`, `pattern`, `step` ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))

### Changed
- Updated `validate` directive companions and documentation for pristine-aware errors ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- Updated `$form` hover docs with all new properties ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))
- Updated form snippet with new validation pattern ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))

### Removed
- Obsolete built-in validators: `between`, `match`, `phone`, `cpf`, `cnpj`, `creditcard` ([`8c67713`](https://github.com/no-js-dev/nojs-lsp/commit/8c67713))

## [0.2.0](https://github.com/no-js-dev/nojs-lsp/compare/v0.1.0...v0.2.0) — 2026-03-13

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
