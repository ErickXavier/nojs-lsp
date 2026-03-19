# Inlay Hints

The No.JS LSP provides inlay hints — small inline annotations displayed directly in the editor — to surface contextual information without requiring you to look it up.

---

## Hint Types

### Loop Variable Hints

When you use an `each` or `foreach` directive, the LSP displays the available loop context variables as a hint after the attribute value:

```html
<li each="item in items"> → $index, $count, $first, $last, $even, $odd
                         ▲
                         inlay hint (parameter)
```

```html
<li foreach="item" from="items"> → $index, $count, $first, $last, $even, $odd
                                ▲
                                inlay hint (parameter)
```

Both `each` and `foreach` show the same set of available context variables:

| Variable | Description |
|----------|-------------|
| `$index` | Zero-based iteration index |
| `$count` | Total number of items |
| `$first` | `true` on the first iteration |
| `$last` | `true` on the last iteration |
| `$even` | `true` on even iterations (0, 2, 4, …) |
| `$odd` | `true` on odd iterations (1, 3, 5, …) |

These variables are available inside the loop body. The hint serves as a quick reminder of what's accessible without checking the docs.

### HTTP Method Badge

When an element uses an HTTP directive (`get`, `post`, `put`, `patch`, `delete`) together with the `as` companion attribute, the LSP shows a method badge after the `as` value:

```html
<div get="/api/users" as="users"> GET
                                 ▲
                                 inlay hint (type)
```

```html
<form post="/api/submit" as="result"> POST
                                     ▲
                                     inlay hint (type)
```

This makes the HTTP method immediately visible even when the element has many attributes or spans multiple lines.

| Directive | Badge |
|-----------|-------|
| `get` | `GET` |
| `post` | `POST` |
| `put` | `PUT` |
| `patch` | `PATCH` |
| `delete` | `DELETE` |

---

## Configuration

Inlay hints are controlled by VS Code's built-in setting:

```json
{
  "editor.inlayHints.enabled": "on"
}
```

Accepted values:

| Value | Behavior |
|-------|----------|
| `"on"` | Always show inlay hints |
| `"off"` | Never show inlay hints |
| `"onUnlessPressed"` | Show hints, hide while holding Ctrl+Alt |
| `"offUnlessPressed"` | Hide hints, show while holding Ctrl+Alt |

No extension-specific setting is needed — the LSP respects whatever you configure in VS Code.

---

## Performance

Inlay hints are computed only for elements within the visible editor range. Scrolling recalculates hints for the new viewport. This keeps the provider efficient even in large HTML documents.

---

## See Also

- [Semantic Highlighting](semantic-highlighting.md) — color-coded context variables in expressions
- [Completions](completions.md) — auto-complete for loop variables and HTTP companions
- [Hover Documentation](hover.md) — full directive documentation on hover
