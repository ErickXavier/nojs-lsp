# Adding a Directive

Step-by-step guide for adding a new No.JS directive to the LSP extension. For architecture context, see [architecture.md](architecture.md).

## 1. Add entry to `server/src/data/directives.json`

Open the `directives` array and add an object with these fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Attribute name (e.g. `"cloak"`). |
| `pattern` | `boolean` | Yes | `true` if the name is a prefix pattern (e.g. `on:*`, `class:*`). `false` for exact-match names. |
| `priority` | `number` | Yes | Processing order. `0` = state, `1` = HTTP, `2` = computed/watch, higher = later. |
| `valueType` | `string` | Yes | Expected value type: `"expression"`, `"object"`, `"string"`, `"url"`, `"identifier"`, etc. |
| `valueDescription` | `string` | Yes | Human-readable label for the value (shown in completions/hover). |
| `requiresValue` | `boolean` | Yes | Whether the attribute must have a value (`false` for boolean attrs like `else`). |
| `companions` | `array` | Yes | Related attributes. Each entry: `{ "name", "type", "description" }`. Use `[]` if none. |
| `companionsSameAs` | `string` | No | Name of another directive whose companions apply (e.g. `"get"` for `post`/`put`/`patch`/`delete`). |
| `documentation` | `string` | Yes | Markdown shown on hover. Include a brief description, an HTML example in a fenced code block, and a list of companions. |
| `category` | `string` | Yes | Grouping for completions: `"state"`, `"http"`, `"binding"`, `"conditional"`, `"loop"`, `"ui"`, etc. |

### Existing entry for reference

```json
{
  "name": "state",
  "pattern": false,
  "priority": 0,
  "valueType": "object",
  "valueDescription": "JS object literal",
  "requiresValue": true,
  "companions": [
    { "name": "persist", "type": "boolean", "description": "No.JS: Persist state to localStorage" },
    { "name": "persist-key", "type": "string", "description": "No.JS: Custom localStorage key" }
  ],
  "documentation": "Declares reactive state on the element. The value is evaluated as a JavaScript object literal.\n\n**Example:**\n```html\n<div state=\"{ count: 0, name: 'World' }\">\n```\n\n**Companions:** `persist`, `persist-key`",
  "category": "state"
}
```

### Boolean directive (no value, no companions)

Directives like `else` set `requiresValue: false` and `companions: []`:

```json
{
  "name": "else",
  "pattern": false,
  "priority": 3,
  "valueType": "none",
  "valueDescription": "",
  "requiresValue": false,
  "companions": [
    { "name": "then", "type": "templateId", "description": "No.JS: Template ID for else branch" }
  ],
  "documentation": "Fallback branch after `if` or `else-if`. No value needed.\n\n**Example:**\n```html\n<div else>Default content</div>\n```",
  "category": "conditional"
}
```

### Shared companions via `companionsSameAs`

HTTP directives (`post`, `put`, `patch`, `delete`) reuse `get`'s companions:

```json
{
  "name": "post",
  "pattern": false,
  "priority": 1,
  "valueType": "url",
  "valueDescription": "URL string or expression",
  "requiresValue": true,
  "companionsSameAs": "get",
  "companions": [],
  "documentation": "Performs an HTTP POST request. Same companions as `get`.\n\n**Example:**\n```html\n<form post=\"/api/users\" body=\"{ name, email }\" as=\"result\">\n```",
  "category": "http"
}
```

## 2. Add entry to `data/nojs-custom-data.json`

This file powers VS Code's native HTML IntelliSense (attribute list, hover in non-LSP contexts). Add an entry to the `globalAttributes` array:

```json
{
  "name": "cloak",
  "description": {
    "kind": "markdown",
    "value": "No.JS: Hides element until the framework initializes.\n\n```html\n<div cloak>Content hidden until ready</div>\n```"
  }
}
```

For boolean attributes (no value expected), add `"valueSet": "v"` to signal VS Code that the attribute is valueless:

```json
{
  "name": "cloak",
  "description": { "kind": "markdown", "value": "..." },
  "valueSet": "v"
}
```

Also add companion attributes here if they aren't already present.

## 3. Update providers (if custom behavior needed)

Most directives work automatically with the existing providers — completions, hover, diagnostics, and semantic tokens all read from `directives.json` via the directive registry.

Custom provider logic is only needed when:

- The directive has **special completion behavior** (e.g. dynamic values from workspace scanning) → edit `server/src/providers/completion.ts`
- The directive needs **custom diagnostics** beyond standard validation → edit `server/src/providers/diagnostics.ts`
- The directive introduces **go-to-definition targets** (templates, stores, routes) → edit `server/src/providers/definition.ts`
- The directive should appear in the **document symbol outline** → edit `server/src/providers/symbols.ts`
- The directive requires **inlay hints** → edit `server/src/providers/inlay-hints.ts`

## 4. Add tests

Create or update tests in `test/unit/`. The standard pattern:

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onCompletion } from '../../server/src/providers/completion';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    all: () => [doc],
    doc,
  };
}

describe('cloak directive', () => {
  it('appears in completion list', async () => {
    // ... call onCompletion handler, assert 'cloak' is in results
  });

  it('shows hover documentation', async () => {
    // ... call onHover handler at the 'cloak' attribute position
  });
});
```

Run tests with:

```sh
npm test
```

## 5. Update snippets (if applicable)

If the directive has a common usage pattern, add a snippet to `snippets/nojs.json`:

```json
{
  "No.JS Cloak": {
    "prefix": "cloak",
    "body": [
      "<${1:div} cloak>",
      "\t$0",
      "</${1:div}>"
    ],
    "description": "No.JS element hidden until framework init"
  }
}
```

## Example: adding a `cloak` directive

A hypothetical `cloak` directive that hides an element until No.JS initializes (prevents flash of unrendered content).

### Step 1 — `server/src/data/directives.json`

```json
{
  "name": "cloak",
  "pattern": false,
  "priority": 10,
  "valueType": "none",
  "valueDescription": "",
  "requiresValue": false,
  "companions": [],
  "documentation": "Hides the element until No.JS initializes, preventing a flash of unrendered content.\n\n**Example:**\n```html\n<div cloak>\n  <span bind=\"message\">{{ message }}</span>\n</div>\n```\n\nThe `[cloak]` style is automatically injected by the framework.",
  "category": "ui"
}
```

### Step 2 — `data/nojs-custom-data.json`

```json
{
  "name": "cloak",
  "description": {
    "kind": "markdown",
    "value": "No.JS: Hides element until the framework initializes.\n\n```html\n<div cloak>Content hidden until ready</div>\n```"
  },
  "valueSet": "v"
}
```

### Step 3 — No custom provider logic required

`cloak` is a simple boolean attribute — standard completions, hover, and diagnostics handle it automatically.

### Step 4 — Tests

Add tests to `test/unit/completion.test.ts` and `test/unit/hover.test.ts` verifying that `cloak` appears in completions and its documentation is returned on hover.

### Step 5 — Snippet

```json
{
  "No.JS Cloak": {
    "prefix": "cloak",
    "body": ["<${1:div} cloak>$0</${1:div}>"],
    "description": "No.JS element hidden until framework init"
  }
}
```
