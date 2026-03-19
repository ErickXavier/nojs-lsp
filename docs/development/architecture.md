# Architecture

This document describes the internal architecture of the No.JS LSP extension — how the client and server communicate, how metadata is loaded, and how providers are wired.

## Project structure

```
client/src/
└── extension.ts              # VS Code extension entry point; spawns LSP server via IPC

server/src/
├── server.ts                 # Server lifecycle, provider wiring, document management
├── capabilities.ts           # ServerCapabilities declaration (sync, completion, hover, etc.)
├── directive-registry.ts     # Reads JSON data at startup, builds Map lookups, resolves companions
├── html-parser.ts            # HTML attribute parsing via vscode-html-languageservice
├── expression-analyzer.ts    # Pipe expression parsing, filter extraction, syntax validation
├── workspace-scanner.ts      # Scans workspace for i18n keys, routes, stores, custom directives
├── devtools-bridge.ts        # Chrome DevTools Protocol client for live runtime integration
├── data/
│   ├── directives.json       # 39 directive definitions (companions, patterns, categories)
│   ├── filters.json          # 32 built-in filter definitions
│   └── validators.json       # Built-in form validator definitions
└── providers/
    ├── completion.ts          # Directive, filter, validator, animation completions
    ├── hover.ts               # Inline documentation on hover
    ├── diagnostics.ts         # Validation warnings, "did you mean?" suggestions
    ├── definition.ts          # Go-to-definition for templates, refs, stores
    ├── references.ts          # Find references across documents
    ├── symbols.ts             # Document symbol outline
    ├── links.ts               # Clickable URLs and file paths
    ├── semantic-tokens.ts     # Syntax highlighting tokens
    ├── code-actions.ts        # Quick fixes (quickfix kind)
    └── inlay-hints.ts         # Loop variable hints

bin/
└── nojs-language-server.js   # Standalone stdio entry point for non-VS Code editors

data/
└── nojs-custom-data.json     # VS Code HTML custom data for native IntelliSense

snippets/
└── nojs.json                 # Code snippets contributed to HTML files

test/
├── __mocks__/                # VS Code API mocks
├── fixtures/                 # HTML test fixtures
└── unit/                     # Jest unit tests (one per provider/module)
```

## Client-server model

The extension follows the standard [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) architecture — a thin **client** running inside VS Code and a **server** running in a separate Node.js process.

### Client (`client/src/extension.ts`)

The client's only job is to start and stop the server:

1. On activation (triggered by `onLanguage:html`), it resolves the bundled server module at `out/server/src/server.js`.
2. It creates a `LanguageClient` with `TransportKind.ipc` for production and debug modes.
3. It configures the client to target `{ scheme: 'file', language: 'html' }` documents and synchronize the `nojs` configuration section.
4. On deactivation, it calls `client.stop()`.

The client does **no** document analysis — all intelligence lives server-side.

### Server (`server/src/server.ts`)

The server creates a connection via `createConnection(ProposedFeatures.all)`, which auto-detects the transport (IPC when spawned by VS Code, stdio when invoked from the CLI).

## Data-driven design

All directive, filter, and validator metadata lives in static JSON files under `server/src/data/`. The `directive-registry.ts` module loads them at import time and builds lookup structures:

| JSON file          | Registry structure         | Lookup API                              |
|--------------------|----------------------------|-----------------------------------------|
| `directives.json`  | `Map<string, DirectiveMeta>` + `PatternMeta[]` | `getDirective()`, `matchDirective()`, `getAllDirectives()`, `getPatterns()` |
| `filters.json`     | `Map<string, FilterMeta>`  | `getFilter()`, `getAllFilters()`        |
| `validators.json`  | `Map<string, ValidatorMeta>` | `getValidator()`, `getAllValidators()` |

### Companion resolution

Directives can declare a `companionsSameAs` field pointing to another directive name. At startup, the registry resolves these references — if a directive has `companionsSameAs: "get"` and an empty `companions` array, it copies the companions from the `get` directive. This avoids duplicating companion definitions across HTTP directives (`get`, `post`, `put`, `patch`, `delete`).

### Additional registry exports

The registry also exposes:
- `getLifecycleEvents()` — lifecycle event names for `on:*`
- `getContextKeys()` — context keys (`$refs`, `$store`, etc.)
- `getLoopContextVars()` — loop-scoped variables (`$index`, `$first`, etc.)
- `getEventHandlerVars()`, `getWatchHandlerVars()`, `getDropHandlerVars()` — handler-scoped variables
- `getAnimations()` — animation names
- `getEventModifiers()` — behavioral, timing, and key modifiers for `on:*`

## Provider pattern

Each LSP feature is implemented in a separate file under `server/src/providers/`. Every provider exports a factory function named `on<Feature>` that accepts the `TextDocuments` manager (and optional settings callbacks) and returns a handler compatible with the LSP connection.

The 10 providers registered in `server.ts`:

| Provider           | Export                | Capability                    |
|--------------------|-----------------------|-------------------------------|
| `completion.ts`    | `onCompletion`, `onCompletionResolve` | `completionProvider` (trigger chars: `-`, `:`, `.`, `\|`, `$`, `=`, `"`, `'`) |
| `hover.ts`         | `onHover`             | `hoverProvider`               |
| `diagnostics.ts`   | `validateTextDocument` | Push-based (`publishDiagnostics`) |
| `definition.ts`    | `onDefinition`        | `definitionProvider`          |
| `references.ts`    | `onReferences`        | `referencesProvider`          |
| `symbols.ts`       | `onDocumentSymbol`    | `documentSymbolProvider`      |
| `links.ts`         | `onDocumentLinks`     | `documentLinkProvider`        |
| `semantic-tokens.ts` | `onSemanticTokens`  | `semanticTokensProvider` (full) |
| `code-actions.ts`  | `onCodeAction`        | `codeActionProvider` (quickfix) |
| `inlay-hints.ts`   | `onInlayHints`        | `inlayHintProvider`           |

Wiring in `server.ts`:

```ts
connection.onCompletion(onCompletion(documents, settingsCallback));
connection.onCompletionResolve(onCompletionResolve);
connection.onHover(onHover(documents, getDevToolsBridge));
connection.onDefinition(onDefinition(documents));
connection.onReferences(onReferences(documents));
connection.onDocumentSymbol(onDocumentSymbol(documents));
connection.onDocumentLinks(onDocumentLinks(documents));
connection.languages.semanticTokens.on(onSemanticTokens(documents));
connection.onCodeAction(onCodeAction(documents));
connection.languages.inlayHint.on(onInlayHints(documents));
```

Diagnostics is the exception — it uses push-based `publishDiagnostics` rather than a pull provider. Validation runs on document content changes with a 200ms debounce.

## Server lifecycle

### 1. Initialization (`onInitialize`)

- Detects client capabilities (`workspace.configuration`, `workspace.workspaceFolders`).
- Extracts workspace folder URIs and passes them to `setWorkspaceRoots()` for the workspace scanner.
- Returns `ServerCapabilities` from `getServerCapabilities()`.

### 2. Post-initialization (`onInitialized`)

- Registers for `DidChangeConfigurationNotification` if the client supports it.
- Subscribes to workspace folder change events to update scanner roots.

### 3. Configuration changes (`onDidChangeConfiguration`)

- Clears the per-document settings cache.
- Revalidates all open documents.
- Manages the DevTools bridge — connects/disconnects based on `nojs.devtools.*` settings.

### 4. Document management

The server uses `TextDocuments<TextDocument>` with **incremental sync** (`TextDocumentSyncKind.Incremental`):

- `onDidChangeContent` — triggers debounced validation (200ms).
- `onDidClose` — clears document settings from the cache.
- `onDidSave` — invalidates the workspace scanner cache.

Per-document settings are cached in a `Map<string, Thenable<NoJsSettings>>` and fetched lazily via `connection.workspace.getConfiguration()`.

### 5. Shutdown

The connection handles shutdown/exit per LSP protocol. The DevTools bridge (if active) is destroyed on configuration change or process exit.

## Build pipeline

The project uses **esbuild** (`esbuild.mjs`) to bundle both server and client into CJS modules:

| Property       | Server                          | Client                          |
|----------------|----------------------------------|----------------------------------|
| Entry point    | `server/src/server.ts`          | `client/src/extension.ts`       |
| Output         | `out/server/src/server.js`      | `out/client/src/extension.js`   |
| Format         | CommonJS                        | CommonJS                        |
| Platform       | Node                            | Node                            |
| Target         | `node18`                        | `node18`                        |
| Externals      | `vscode`                        | `vscode`                        |
| Source maps    | Yes                             | Yes                             |

Build commands:

```sh
npm run compile     # One-shot build
npm run watch       # esbuild watch mode (rebuilds on file changes)
npm run package     # vsce package → .vsix
```

The `--watch` flag creates esbuild contexts for both entrypoints and runs them concurrently.

## Connection modes

The server supports two transport modes via `createConnection(ProposedFeatures.all)`, which auto-detects the transport based on how the process was spawned.

### IPC (VS Code)

The default mode when launched by the VS Code extension client. The client specifies `TransportKind.ipc` in `ServerOptions`, and the connection communicates over Node.js IPC channels. Debug mode attaches an inspector on port 6009.

### stdio (other editors)

For editors like Neovim, Sublime Text, Emacs, or Helix, the standalone entry point at `bin/nojs-language-server.js` launches the server with `--stdio`:

```sh
nojs-language-server --stdio
```

This script simply requires the bundled `out/server/src/server.js`. The editor spawns the process and communicates over stdin/stdout.

The `bin` field in `package.json` registers the command:

```json
"bin": {
  "nojs-language-server": "./bin/nojs-language-server.js"
}
```

## Related documentation

- [Getting Started](../getting-started.md) — setup and installation
- [DevTools Bridge](../advanced/devtools-bridge.md) — live runtime integration
- [Expression Analyzer](../advanced/expression-analyzer.md) — expression parsing internals
- [Workspace Scanner](../advanced/workspace-scanner.md) — workspace scanning details
