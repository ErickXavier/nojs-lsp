# Adding a Provider

Step-by-step guide for adding a new LSP provider to the No.JS extension. For architecture context, see [architecture.md](architecture.md).

## Overview

Providers implement LSP features (completions, hover, diagnostics, etc.). Each provider:

1. Lives in `server/src/providers/<name>.ts`
2. Exports an `on<Feature>()` factory function that receives shared dependencies and returns an LSP request handler
3. Is registered in `server/src/server.ts`
4. Has its capability declared in `server/src/capabilities.ts`

## 1. Create the provider file

Create `server/src/providers/<name>.ts`. The standard pattern is a factory function that closes over `documents` (and optionally other dependencies) and returns an async handler:

```typescript
import {
  TextDocuments,
  // Import the relevant LSP types for your feature, e.g.:
  // FoldingRange, FoldingRangeParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getElementAtOffset } from '../html-parser';

export function onFolding(documents: TextDocuments<TextDocument>) {
  return async (params: FoldingRangeParams): Promise<FoldingRange[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const htmlDoc = parseHtmlDocument(document);

    // ... implement feature logic

    return results;
  };
}
```

### Existing provider signatures for reference

```typescript
// Completion — receives documents + settings callback
export function onCompletion(
  documents: TextDocuments<TextDocument>,
  getSettings: (uri: string) => Promise<CompletionSettings>,
) { ... }

// Hover — receives documents + optional devtools bridge
export function onHover(
  documents: TextDocuments<TextDocument>,
  getBridge?: () => DevToolsBridge | null,
) { ... }

// Definition, References, Symbols, Links — receive documents only
export function onDefinition(documents: TextDocuments<TextDocument>) { ... }
export function onReferences(documents: TextDocuments<TextDocument>) { ... }
export function onDocumentSymbol(documents: TextDocuments<TextDocument>) { ... }
export function onDocumentLinks(documents: TextDocuments<TextDocument>) { ... }

// Semantic tokens, Code actions, Inlay hints — receive documents only
export function onSemanticTokens(documents: TextDocuments<TextDocument>) { ... }
export function onCodeAction(documents: TextDocuments<TextDocument>) { ... }
export function onInlayHints(documents: TextDocuments<TextDocument>) { ... }

// Diagnostics — uses push model, different signature
export function validateTextDocument(
  document: TextDocument,
  connection: Connection,
  options: { validationEnabled: boolean },
) { ... }
```

## 2. Register the handler in `server/src/server.ts`

Import your provider and wire it to the appropriate connection method. The registration block in `server.ts` currently looks like this:

```typescript
// Wire up providers
connection.onCompletion(onCompletion(documents, async (uri) => {
  const s = await getDocumentSettings(uri);
  return {
    filtersEnabled: s.completion.filters,
    customFilters: s.customFilters,
    customValidators: s.customValidators,
  };
}));
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

Add your provider following the same pattern:

```typescript
import { onFolding } from './providers/folding';

// In the provider wiring block:
connection.onFoldingRanges(onFolding(documents));
```

> **Note:** Some features use `connection.on<Feature>()` directly (completion, hover, definition, etc.) while others use `connection.languages.<feature>.on()` (semantic tokens, inlay hints). Check the [LSP specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) for the correct registration method for your feature.

## 3. Declare the capability in `server/src/capabilities.ts`

The server advertises which features it supports via `ServerCapabilities`. The current implementation:

```typescript
import {
  ServerCapabilities,
  TextDocumentSyncKind,
  CompletionOptions,
  SemanticTokensOptions,
} from 'vscode-languageserver/node';
import { SEMANTIC_TOKENS_LEGEND } from './providers/semantic-tokens';

export function getServerCapabilities(hasWorkspaceFolderCapability: boolean): ServerCapabilities {
  const capabilities: ServerCapabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ['-', ':', '.', '|', '$', '=', '"', "'"],
    } as CompletionOptions,
    hoverProvider: true,
    definitionProvider: true,
    referencesProvider: true,
    documentSymbolProvider: true,
    documentLinkProvider: { resolveProvider: false },
    semanticTokensProvider: {
      legend: SEMANTIC_TOKENS_LEGEND,
      full: true,
    } as SemanticTokensOptions,
    codeActionProvider: { codeActionKinds: ['quickfix'] },
    inlayHintProvider: true,
    // ...
  };
  return capabilities;
}
```

Add the capability for your feature:

```typescript
foldingRangeProvider: true,
```

Some capabilities are simple booleans (`true`), others are objects with configuration. Refer to the LSP specification for the correct shape.

## 4. Add tests

Create `test/unit/<name>.test.ts`. Follow the existing test pattern:

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onFolding } from '../../server/src/providers/folding';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    all: () => [doc],
    doc,
  };
}

describe('FoldingProvider', () => {
  it('returns folding ranges for directive blocks', async () => {
    const content = '<div if="show">\n  <p>Hello</p>\n</div>';
    const mock = createMockDocuments(content);
    const handler = onFolding(mock as any);
    const result = await handler({
      textDocument: { uri: mock.doc.uri },
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
```

Run tests:

```sh
npm test
```

## Checklist

| Step | File | Action |
|---|---|---|
| 1 | `server/src/providers/<name>.ts` | Create provider with `on<Feature>()` factory |
| 2 | `server/src/server.ts` | Import and register handler on `connection` |
| 3 | `server/src/capabilities.ts` | Declare capability in `getServerCapabilities()` |
| 4 | `test/unit/<name>.test.ts` | Add unit tests |
| 5 | Build & verify | Run `npm run compile && npm test` |
