# Testing

Unit tests for the No.JS LSP extension use Jest with ts-jest. This guide covers setup, conventions, and how to write new tests.

## Test setup

The test configuration lives in [`jest.config.js`](../../jest.config.js):

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/test/e2e/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/test/__mocks__/vscode.ts',
  },
};
```

Key points:
- **`ts-jest`** transforms TypeScript on the fly — no compile step needed before running tests.
- **`node` environment** — tests run in Node.js, not jsdom.
- **`moduleNameMapper`** redirects `vscode` imports to the mock at `test/__mocks__/vscode.ts`.

### Dependencies

| Package | Purpose |
|---|---|
| `jest` ^29.7.0 | Test runner |
| `ts-jest` ^29.1.0 | TypeScript transform for Jest |
| `@types/jest` ^29.5.0 | Type definitions |
| `vscode-languageserver-textdocument` ^1.0.0 | Used to create mock `TextDocument` instances in tests |

## VS Code API mock

Since tests run in Node.js (not inside VS Code), the `vscode` module is unavailable. The file [`test/__mocks__/vscode.ts`](../../test/__mocks__/vscode.ts) provides a lightweight stub:

```typescript
export const workspace = {
  createFileSystemWatcher: jest.fn(),
  getConfiguration: jest.fn(),
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
};

export const ExtensionContext = {};

export const languages = {
  createDiagnosticCollection: jest.fn(),
};

export const Uri = {
  file: (path: string) => ({ scheme: 'file', fsPath: path }),
};
```

The mock only covers APIs referenced by server-side code. If a new provider imports additional `vscode` APIs, add the corresponding stubs here.

> **Note:** Server-side providers use `vscode-languageserver` types (not the `vscode` module directly), so most tests don't hit this mock at all. It primarily exists for any client-side code that leaks into the test graph.

## Test fixtures

HTML fixture files live in `test/fixtures/`:

| File | Purpose |
|---|---|
| `all-directives.html` | Complete HTML document using every No.JS directive — state, store, computed, bind, if/else, foreach, HTTP verbs, routing, i18n, animations, and more. Used by tests that need a realistic full-page document. |
| `pipes-errors.html` | Dynamic attribute bindings (`bind-*`), pipe/filter chains (`| uppercase`, `| trim | lowercase | truncate:50`), and intentional error conditions. Used by diagnostics and expression-analyzer tests. |

Fixtures are loaded in tests via `fs.readFileSync` or by inlining the content directly.

## Common test pattern

All provider tests follow the same structure: **create a mock `TextDocument` → call the provider function → assert results**.

### 1. Create a mock document helper

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}
```

`TextDocument.create()` builds a real LSP text document from a string. The returned object mimics the `TextDocuments` container that the server passes to providers.

### 2. Create a shorthand that wires up the provider

```typescript
import { onHover } from '../../server/src/providers/hover';

function getHover(content: string, offset: number) {
  const mock = createMockDocuments(content);
  const handler = onHover(mock as any);
  const position = mock.doc.positionAt(offset);
  return handler({
    textDocument: { uri: mock.doc.uri },
    position,
  });
}
```

The provider factory (`onHover`, `onCompletion`, etc.) returns an async handler. Pass it the mock documents and any other required dependencies (settings callbacks, mock connections), then invoke the handler with an LSP request params object.

### 3. Write test cases

```typescript
describe('HoverProvider', () => {
  it('shows hover for exact directive', async () => {
    const content = '<div state="{ count: 0 }"></div>';
    const hover = await getHover(content, 6); // offset on "state"
    expect(hover).not.toBeNull();
    const value = (hover!.contents as any).value;
    expect(value).toContain('state');
  });

  it('returns null for standard HTML attributes', async () => {
    const content = '<div class="container"></div>';
    const hover = await getHover(content, 7);
    expect(hover).toBeNull();
  });
});
```

### Diagnostics pattern (mock connection)

The diagnostics provider pushes results via `connection.sendDiagnostics()` rather than returning them. Create a mock connection to capture output:

```typescript
import { validateTextDocument } from '../../server/src/providers/diagnostics';

function createMockConnection() {
  let lastDiagnostics: Diagnostic[] = [];
  return {
    sendDiagnostics: (params: { uri: string; diagnostics: Diagnostic[] }) => {
      lastDiagnostics = params.diagnostics;
    },
    getDiagnostics: () => lastDiagnostics,
  };
}

it('reports error for directive missing required value', async () => {
  const doc = TextDocument.create('file:///test.html', 'html', 1, '<div get></div>');
  const conn = createMockConnection();
  await validateTextDocument(doc, conn as any);
  const diagnostics = conn.getDiagnostics();
  expect(diagnostics.find(d => d.message.includes('"get" requires a value'))).toBeDefined();
});
```

## Test files

All 15 unit test files in `test/unit/`:

| File | Tests |
|---|---|
| `code-actions.test.ts` | Quick-fix code actions |
| `completion.test.ts` | Directive, filter, companion, and pattern completions |
| `definition.test.ts` | Go-to-definition for templates, refs, stores |
| `devtools-bridge.test.ts` | DevTools integration bridge |
| `diagnostics.test.ts` | Validation warnings, required values, orphaned else/else-if |
| `directive-registry.test.ts` | `getAllDirectives()`, `getPatterns()`, `getCompanionsForDirectives()` |
| `expression-analyzer.test.ts` | Expression syntax validation |
| `hover.test.ts` | Inline documentation on hover |
| `html-parser.test.ts` | HTML attribute parsing utilities |
| `inlay-hints.test.ts` | Loop variable inlay hints |
| `links.test.ts` | Clickable URLs and file paths |
| `references.test.ts` | Find references across documents |
| `semantic-tokens.test.ts` | Syntax highlighting tokens |
| `symbols.test.ts` | Document symbol outline |
| `workspace-scanner.test.ts` | Workspace scanning for routes, stores, i18n keys |

## Running tests

### All tests

```sh
npm test
```

### Specific test file

```sh
npm test -- --testPathPattern=completion
npm test -- --testPathPattern=diagnostics
```

The pattern matches against the full file path, so partial names work.

### Single test by name

```sh
npm test -- -t "suggests directives when typing"
```

### Watch mode

```sh
npx jest --watch
```

### Coverage

```sh
npx jest --coverage
```

Coverage output goes to `coverage/` by default.

## Writing a new test

Follow these steps when adding tests for a new provider. See [adding-a-provider.md](adding-a-provider.md) for the provider side.

### 1. Create the test file

```
test/unit/<provider-name>.test.ts
```

### 2. Import the provider and set up helpers

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onMyFeature } from '../../server/src/providers/my-feature';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    all: () => [doc],
    doc,
  };
}

function getMyFeatureResult(content: string, offset: number) {
  const mock = createMockDocuments(content);
  const handler = onMyFeature(mock as any);
  const position = mock.doc.positionAt(offset);
  return handler({
    textDocument: { uri: mock.doc.uri },
    position,
  });
}
```

### 3. Write describe/it blocks

```typescript
describe('MyFeatureProvider', () => {
  it('returns results for No.JS attributes', async () => {
    const content = '<div state="{ x: 1 }"></div>';
    const result = await getMyFeatureResult(content, 6);
    expect(result).toBeDefined();
    // ... assertions specific to the feature
  });

  it('returns nothing for standard HTML', async () => {
    const content = '<div class="foo"></div>';
    const result = await getMyFeatureResult(content, 7);
    expect(result).toBeNull();
  });
});
```

### 4. Run and verify

```sh
npm test -- --testPathPattern=my-feature
```

### Tips

- **Offset calculation**: `positionAt(offset)` converts a character offset to a line/character position. Count from the start of the HTML string to land on the attribute you want to test.
- **Fresh state**: If your provider reads workspace-scanned data, call `invalidateCache()` (from `workspace-scanner`) before each test to avoid stale results.
- **`as any` casts**: The mock documents object doesn't implement the full `TextDocuments` interface. Casting to `any` is standard practice in these tests.
- **Async handlers**: All provider handlers are async — always `await` the result.

## Debugging tests

### Via command line

```sh
node --inspect-brk node_modules/.bin/jest --testPathPattern=completion --runInBand
```

Then attach VS Code's debugger using the **Attach to Server** launch configuration on port 9229.

### Via VS Code launch configuration

Add a Jest debug configuration to `.vscode/launch.json`:

```json
{
  "name": "Debug Tests",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--testPathPattern=${fileBasenameNoExtension}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Open a test file and run **Debug Tests** to debug that file with breakpoints.
