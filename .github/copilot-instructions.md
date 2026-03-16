# No.JS LSP — Project Guidelines

## Overview

VS Code language server extension for the No.JS framework. Provides completions, hover docs, diagnostics, go-to-definition, find references, semantic highlighting, code actions, inlay hints, and snippets for No.JS HTML attributes.

## Architecture

```
client/src/
└── extension.ts          # VS Code extension entry, spawns LSP server via IPC

server/src/
├── server.ts             # LSP server: document lifecycle, workspace scanning, config
├── capabilities.ts       # Server capability declarations
├── directive-registry.ts # getAllDirectives(), getPatterns(), getCompanionsForDirectives()
├── expression-analyzer.ts # Expression validation (validateExpressionSyntax)
├── html-parser.ts        # HTML attribute parsing for LSP features
├── workspace-scanner.ts  # Scans workspace for routes, stores, custom directives, i18n keys
├── devtools-bridge.ts    # DevTools integration bridge
├── data/
│   ├── directives.json   # 36+ directive definitions (companions, docs, categories)
│   ├── filters.json      # 32 built-in filters
│   └── validators.json   # Built-in form validators
└── providers/            # One file per LSP feature
    ├── completion.ts     # Directive/filter/validator/animation completions
    ├── hover.ts          # Inline documentation on hover
    ├── diagnostics.ts    # Validation warnings, "did you mean?" suggestions
    ├── definition.ts     # Go-to-definition for templates/refs/stores
    ├── references.ts     # Find references across documents
    ├── symbols.ts        # Document symbol outline
    ├── links.ts          # Clickable URLs and file paths
    ├── semantic-tokens.ts # Syntax highlighting tokens
    ├── code-actions.ts   # Quick fixes
    └── inlay-hints.ts    # Loop variable hints

data/
└── nojs-custom-data.json # VS Code HTML custom data for IntelliSense

snippets/
└── nojs.json             # Code snippets
```

## Conventions

- **Provider functions**: named `on<Feature>` (e.g., `onCompletion`, `onHover`, `onDefinition`)
- **Metadata interfaces**: named `<Feature>Meta` (e.g., `DirectiveMeta`, `FilterMeta`)
- **Strict TypeScript**: all types explicit, `strict: true` in tsconfig
- **Function-based**: pure functions for parsing/matching/filtering — no class-based architecture
- **Data-driven**: directive/filter/validator metadata lives in JSON files, imported via `resolveJsonModule`

## Build

```sh
npm run compile       # esbuild → out/server/src/server.js + out/client/src/extension.js
npm run watch         # esbuild watch mode
npm run package       # vsce package → .vsix
```

Build target: Node 18, CJS output, `vscode` is external. Version must match the NoJS framework version.

## Testing

```sh
npm test              # Jest unit tests (ts-jest, node environment)
```

- Tests live in `test/unit/*.test.ts`
- VS Code API is mocked via `test/__mocks__/vscode.ts`
- Test fixtures in `test/fixtures/*.html`
- Pattern: create mock `TextDocument` with HTML → call provider function → assert results

## Key Patterns

- When the NoJS framework adds/changes a directive → update `server/src/data/directives.json` and `data/nojs-custom-data.json`
- When adding a new filter → update `server/src/data/filters.json`
- When adding a new provider → register handler in `server/src/server.ts`, add tests in `test/unit/`
- Use the `@sync-nojs` agent to propagate framework changes to this repo
- Diagnostics should provide actionable messages with "did you mean?" suggestions where applicable
