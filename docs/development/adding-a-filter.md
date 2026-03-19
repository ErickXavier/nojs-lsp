# Adding a Filter

Step-by-step guide for adding a new No.JS filter to the LSP extension. For architecture context, see [architecture.md](architecture.md).

## 1. Add entry to `server/src/data/filters.json`

Open the `filters` array and add an object with these fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Filter name as used in pipe expressions (e.g. `"mask"`). |
| `description` | `string` | Yes | Brief description prefixed with `"No.JS: "`. Shown in completions and hover. |
| `args` | `array` | Yes | Filter arguments. Each entry: `{ "name", "type", "required"?, "default"? }`. Use `[]` for no-arg filters. |
| `example` | `string` | Yes | Usage example showing the pipe syntax (e.g. `"phone | mask:'(###) ###-####'"`). |
| `category` | `string` | Yes | Grouping: `"string"`, `"number"`, `"collection"`, `"date"`, `"utility"`. |

### Argument fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Argument name. |
| `type` | `string` | Yes | Expected type: `"string"`, `"number"`, `"any"`. |
| `required` | `boolean` | No | If `true`, diagnostics warn when the argument is missing. Omit for optional args. |
| `default` | `string \| number` | No | Default value shown in documentation. |

### Existing entries for reference

**No-arg filter:**

```json
{
  "name": "uppercase",
  "description": "No.JS: Converts string to UPPERCASE.",
  "args": [],
  "example": "name | uppercase",
  "category": "string"
}
```

**Filter with required arg:**

```json
{
  "name": "truncate",
  "description": "No.JS: Truncates string to given length.",
  "args": [
    { "name": "length", "type": "number", "required": true },
    { "name": "suffix", "type": "string", "default": "..." }
  ],
  "example": "text | truncate:100:'…'",
  "category": "string"
}
```

**Filter with multiple args (all required):**

```json
{
  "name": "where",
  "description": "No.JS: Filters array by property value.",
  "args": [
    { "name": "key", "type": "string", "required": true },
    { "name": "value", "type": "any", "required": true }
  ],
  "example": "users | where:'active':true",
  "category": "collection"
}
```

## 2. Add tests

Create or extend tests in `test/unit/completion.test.ts` and `test/unit/hover.test.ts`:

```typescript
it('suggests mask filter after pipe', async () => {
  const content = '<span bind="phone | "></span>';
  const items = await getCompletions(content, 19); // after "| "
  const labels = items.map(i => i.label);
  expect(labels).toContain('mask');
});
```

For diagnostics, extend `test/unit/diagnostics.test.ts` to verify that missing required args produce warnings:

```typescript
it('warns when mask filter is missing required pattern arg', async () => {
  const content = '<span bind="phone | mask"></span>';
  const diagnostics = await getDiagnostics(content);
  expect(diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: expect.stringContaining('mask'),
      }),
    ])
  );
});
```

Run tests:

```sh
npm test
```

## 3. Verify completions, hover, diagnostics

All three providers read filters from the registry automatically. After adding the JSON entry:

- **Completions**: the filter appears after `|` in expression attributes (`bind`, `bind-html`, `class:*`, etc.)
- **Hover**: hovering over the filter name shows the description, args, and example
- **Diagnostics**: missing required args and unknown filter names trigger warnings

No provider code changes are needed unless the filter has special behavior (e.g. context-dependent suggestions).

## Example: adding a `mask` filter

A hypothetical `mask` filter that formats a string according to a pattern (e.g. phone numbers, credit cards).

### Step 1 — `server/src/data/filters.json`

```json
{
  "name": "mask",
  "description": "No.JS: Formats string according to a mask pattern. Use # for digits, A for letters, * for any character.",
  "args": [
    { "name": "pattern", "type": "string", "required": true },
    { "name": "placeholder", "type": "string", "default": "_" }
  ],
  "example": "phone | mask:'(###) ###-####'",
  "category": "string"
}
```

### Step 2 — Tests

In `test/unit/completion.test.ts`:

```typescript
it('suggests mask filter in pipe completions', async () => {
  const content = '<span bind="phone | "></span>';
  const items = await getCompletions(content, 19);
  expect(items.map(i => i.label)).toContain('mask');
});
```

In `test/unit/hover.test.ts`:

```typescript
it('returns hover for mask filter', async () => {
  const content = '<span bind="phone | mask:\'(###) ###-####\'"></span>';
  const hover = await getHover(content, 21); // on 'mask'
  expect(hover?.contents).toBeDefined();
});
```

### Step 3 — Verify

Build and reload the extension. In an HTML file, type:

```html
<span bind="phone | "></span>
```

- `mask` should appear in the completion list after `|`
- Hovering over `mask` should show its description and example
- Omitting the required `pattern` arg (`phone | mask`) should produce a diagnostic warning
