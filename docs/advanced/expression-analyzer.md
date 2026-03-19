# Expression Analyzer

The expression analyzer parses No.JS directive values, extracts filter chains, and validates expression syntax. It powers real-time [diagnostics](../features/diagnostics.md) by catching bracket mismatches, unterminated strings, and malformed expressions before the page runs.

Source: [`server/src/expression-analyzer.ts`](../../server/src/expression-analyzer.ts)

---

## Data Types

### `FilterSegment`

Represents a single filter in a pipe chain:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Filter name (e.g. `uppercase`, `currency`) |
| `args` | `string[]` | Arguments passed after `:` separators |
| `offset` | `number` | Character offset of the filter name within the original expression |

### `ParsedExpression`

The result of parsing a full directive expression:

| Property | Type | Description |
|----------|------|-------------|
| `base` | `string` | The expression before any pipe operators |
| `filters` | `FilterSegment[]` | Ordered list of filter segments |
| `syntaxError` | `string \| null` | Syntax error in the base expression, or `null` if valid |

---

## Functions

### `parseExpression(expr)`

Parses a directive expression string into its base expression and filter chain.

**Returns:** `ParsedExpression`

**Behavior:**

1. Splits the expression by pipe `|` operators using `splitPipes()` (see [Pipe Splitting](#pipe-splitting) below).
2. The first segment becomes the `base` expression.
3. Each subsequent segment is parsed as a filter — split by `:` into a name and arguments array (see [Filter Extraction](#filter-extraction)).
4. Runs `validateExpressionSyntax()` on the base expression to detect syntax errors.

**Examples:**

```
"name"
→ { base: "name", filters: [], syntaxError: null }

"name | uppercase"
→ { base: "name", filters: [{ name: "uppercase", args: [], offset: 7 }], syntaxError: null }

"price | currency:'USD'"
→ { base: "price", filters: [{ name: "currency", args: ["'USD'"], offset: 8 }], syntaxError: null }

"items | where:'active' | count"
→ { base: "items", filters: [
     { name: "where", args: ["'active'"], offset: 8 },
     { name: "count", args: [], offset: 26 }
   ], syntaxError: null }

"data.items[0"
→ { base: "data.items[0", filters: [], syntaxError: "Expected ']'" }
```

Empty or whitespace-only input returns `{ base: '', filters: [], syntaxError: null }`.

---

### Pipe Splitting

Internally, `splitPipes()` walks the expression character by character and splits on `|` operators at the top level. It respects:

- **String literals** — single quotes `'`, double quotes `"`, and backticks `` ` `` (with escape handling via `\`).
- **Logical OR `||`** — two consecutive pipes are treated as the logical OR operator, not a filter separator.
- **Nesting depth** — pipes inside parentheses `()`, brackets `[]`, or braces `{}` are ignored.

This ensures expressions like these are parsed correctly:

```
"a || b"             → 1 segment (logical OR, no filter split)
"fn(a | b)"          → 1 segment (pipe inside parens, no split)
"items[x | y]"       → 1 segment (pipe inside brackets, no split)
"value | trim"       → 2 segments (top-level pipe splits)
"'hello | world'"    → 1 segment (pipe inside string literal)
```

---

### Filter Extraction

Each filter segment after the base expression is parsed by splitting on `:` to separate the filter name from its arguments.

- **No colon** — the entire segment is the filter name with an empty args array.
- **With colons** — the text before the first `:` is the name; the remainder is split by `:` into individual arguments.
- **Quoted strings** — colons inside quoted strings (`'`, `"`, `` ` ``) are not treated as argument separators.

```
"uppercase"          → { name: "uppercase", args: [] }
"currency:'USD'"     → { name: "currency", args: ["'USD'"] }
"truncate:100:'...'" → { name: "truncate", args: ["100", "'...'"] }
"replace:'a|b':'c'"  → { name: "replace", args: ["'a|b'", "'c'"] }
```

---

### `validateExpressionSyntax(expr)`

Checks a base expression (without filters) for structural syntax errors.

**Returns:** `null` if valid, or an error message string.

**Checks performed:**

1. **Bracket/paren/brace balance** — uses a stack to match opening and closing delimiters `()`, `[]`, `{}`. Reports mismatches (e.g. `Unexpected ')'`) and unclosed brackets (e.g. `Expected ']'`).
2. **Unterminated string literals** — detects strings opened with `'`, `"`, or `` ` `` that are never closed. Handles escaped characters (`\'`, `\"`, `` \` ``).

**Examples:**

```
"user.name"           → null (valid)
"items.length > 0"    → null (valid)
"data.items[0"        → "Expected ']'"
"fn(a, b"             → "Expected ')'"
"hello 'world"        → "Unterminated string literal"
"{a: [1, 2)"          → "Unexpected ')'"
```

#### Special Patterns (Validation Skipped)

Certain expression patterns are **not** standard JavaScript and would produce false positives. The analyzer recognizes and skips them:

| Pattern | Example | Why It's Skipped |
|---------|---------|-----------------|
| Loop syntax | `item in items` | `each` / `foreach` directive syntax |
| Object literals | `{ count: 0, name: '' }` | `state` / `value` directive values |
| Array literals | `[1, 2, 3]` | Array values in directives |
| Simple identifiers | `user.name`, `myStore` | Dot-notation paths and names |
| Quoted strings | `'hello'`, `"/path"` | Static string values |
| URL paths | `/api/users`, `https://example.com` | HTTP directives (`get`, `post`, etc.) |
| CSS values | `100px`, `2.5rem`, `50%` | `style-*` binding values |
| Validator rules | `required\|email\|min:5` | Pipe-separated validation rules |

---

### `extractFilterNames(expr)`

Convenience function that returns just the filter names from an expression, without arguments or offsets.

**Returns:** `string[]`

Internally calls `parseExpression()` and maps the result to filter names.

```
"name | uppercase"              → ["uppercase"]
"price | currency:'USD' | pad"  → ["currency", "pad"]
"simple.value"                  → []
```

Useful when you only need to check whether specific filters are used — for example, validating that all referenced filters exist.

---

## Used By

The expression analyzer feeds into several LSP providers:

| Provider | Function Used | Purpose |
|----------|--------------|---------|
| [Diagnostics](../features/diagnostics.md) | `validateExpressionSyntax()` | Reports syntax errors in directive values as warnings |
| [Completions](../features/completions.md) | Pipe-aware parsing logic | Detects `\|` in attribute values to trigger filter completions |
| Semantic Tokens | Pipe/filter detection | Highlights filter names as functions and `\|` as operators |

The diagnostics provider skips validation for directives whose values are not standard expressions (e.g. `get`, `post`, `template`, `path`, `validate`), applying `validateExpressionSyntax()` only where a JavaScript-like expression is expected.
