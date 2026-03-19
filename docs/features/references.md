# Find References

The No.JS LSP supports Find All References for template IDs, element refs, and store names. Place your cursor on a declaration or usage and press **Shift+F12** (or right-click → **Find All References**) to see every reference across the document.

References work **bidirectionally** — you can invoke them from either the declaration or any usage site.

---

## Reference Types

### Template ID References

From a `<template id="...">` declaration or any attribute that references a template ID, Find References locates all usages.

**Scanned attributes:** `use`, `then`, `else`, `loading`, `error`, `empty`, `success`, `error-boundary`, `template`

```html
<!-- Find References on "user-card" (from either location) finds all three usages -->
<template id="user-card">
  <div class="card"><span bind="name"></span></div>
</template>

<div use="user-card"></div>
<div get="/api/users" as="users" then="user-card"></div>
<div get="/api/profile" as="profile" success="user-card"></div>
```

**Results include:**
- The `<template id="user-card">` declaration (when "Include Declaration" is enabled)
- Every attribute value that references `"user-card"` (`use`, `then`, `success`, etc.)

### Ref Name References

From a `ref="name"` declaration or any `$refs.name` usage in an expression, Find References locates all occurrences.

```html
<input ref="search" type="text" />

<!-- All $refs.search usages are found -->
<button on:click="$refs.search.focus()">Focus</button>
<span bind="$refs.search.value"></span>
```

**Results include:**
- The `ref="search"` declaration
- Every `$refs.search` occurrence in attribute expressions

### Store Name References

From a `store="name"` declaration or any `$store.name` usage in an expression, Find References locates all occurrences.

```html
<div store="cart" state="{ items: [], total: 0 }"></div>

<!-- All $store.cart usages are found -->
<span bind="$store.cart.items.length"></span>
<button on:click="$store.cart.items.push(newItem)">Add</button>
<span bind="$store.cart.total | currency"></span>
```

**Results include:**
- The `store="cart"` declaration
- Every `$store.cart` occurrence in attribute expressions

---

## Invocation Points

| Cursor on | Finds |
|-----------|-------|
| `<template id="xxx">` (id attribute) | All attributes referencing template `xxx` |
| `use="xxx"`, `then="xxx"`, `else="xxx"`, etc. | All references to template `xxx` |
| `ref="xxx"` | All `$refs.xxx` usages + the declaration |
| `$refs.xxx` in an expression | All `$refs.xxx` usages + the `ref="xxx"` declaration |
| `store="xxx"` | All `$store.xxx` usages + the declaration |
| `$store.xxx` in an expression | All `$store.xxx` usages + the `store="xxx"` declaration |

Reference resolution is scoped to the current document.

---

## Related

- [Go to Definition](go-to-definition.md) — jump to a template, ref, or store declaration
- [Document Symbols](symbols.md) — outline of all declarations in the document
