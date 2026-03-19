# No.JS LSP — Roadmap

This document tracks planned features and improvements for the No.JS LSP extension.

## Planned

### Per-Feature Toggle Settings

Currently only `nojs.validation.enabled` and `nojs.completion.filters` exist as toggle settings. The following granular toggles are planned:

- [ ] `nojs.completion.enabled` — Enable/disable all directive, filter, and validator completions
- [ ] `nojs.semanticHighlighting.enabled` — Enable/disable semantic token coloring for directives, filters, and variables
- [ ] `nojs.hover.enabled` — Enable/disable on-hover documentation popups

### Enhanced Diagnostics

- [ ] **General duplicate attribute detection** — Warn when the same HTML attribute appears more than once on an element (currently only duplicate `state`/`ref`/wildcard routes are detected)
- [ ] **Missing model type detection** — Warn when `<input model="...">` is missing a `type` attribute

## Shipped

_Features already available in the current release._

- Smart completions (directives, filters, validators, animations, companions)
- Hover documentation
- Real-time diagnostics with "did you mean?" suggestions
- Go-to-definition (templates, refs, stores)
- Find references across document
- Semantic highlighting (directives, prefixes, filters, variables)
- Code actions / quick fixes
- Inlay hints (loop variables, HTTP method badges)
- 23+ code snippets
