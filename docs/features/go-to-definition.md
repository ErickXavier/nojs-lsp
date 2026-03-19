# Go to Definition

The No.JS LSP supports Go to Definition for template references, element refs, and store declarations. Place your cursor on a reference and press **F12** (or **Cmd+Click** on macOS / **Ctrl+Click** on Windows/Linux) to jump directly to the target.

---

## Definition Targets

### Template References via `use`

When the cursor is on a `use` attribute value, Go to Definition jumps to the `<template id="...">` element with the matching ID.

```html
<!-- Cmd+Click on "user-card" jumps to the template below -->
<div use="user-card"></div>

<template id="user-card">
  <div class="card">
    <span bind="name"></span>
  </div>
</template>
```

### Companion Attributes that Reference Templates

The attributes `then`, `else`, `loading`, `error`, `empty`, `success`, and `error-boundary` can reference template IDs. Go to Definition works on all of them.

```html
<!-- Cmd+Click on "spinner" or "error-msg" jumps to the respective template -->
<div get="/api/users" as="users" loading="spinner" error="error-msg">
  <li each="user in users" bind="user.name"></li>
</div>

<template id="spinner">
  <p>Loading…</p>
</template>

<template id="error-msg">
  <p>Something went wrong.</p>
</template>
```

**Supported attributes:** `use`, `then`, `else`, `loading`, `error`, `empty`, `success`, `error-boundary`

### Element Refs via `$refs`

When the cursor is on a `$refs.name` expression inside any attribute value, Go to Definition jumps to the element that declares `ref="name"`.

```html
<input ref="emailInput" type="email" />

<!-- Cmd+Click on "$refs.emailInput" jumps to the <input> above -->
<button on:click="$refs.emailInput.focus()">Focus Email</button>
```

### Store References via `$store`

When the cursor is on a `$store.name` expression, Go to Definition jumps to the element that declares `store="name"`.

```html
<div store="auth" state="{ user: null, token: '' }"></div>

<!-- Cmd+Click on "$store.auth" jumps to the store declaration above -->
<span bind="$store.auth.user.name"></span>
```

---

## How It Works

The LSP parses the current document and determines the definition target based on cursor position:

| Cursor on | Jumps to |
|-----------|----------|
| `use="id"` value | `<template id="id">` |
| `then`, `else`, `loading`, `error`, `empty`, `success`, `error-boundary` value | `<template id="...">` with matching ID |
| `$refs.name` in an expression | Element with `ref="name"` |
| `$store.name` in an expression | Element with `store="name"` |

Definition resolution is scoped to the current document.

---

## Related

- [Find References](references.md) — find all usages of a template, ref, or store
- [Document Symbols](symbols.md) — outline of templates, refs, stores, and other declarations
- [Document Links](links.md) — clickable URLs in HTTP and routing attributes
