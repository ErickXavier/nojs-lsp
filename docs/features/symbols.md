# Document Symbols

The No.JS LSP provides document symbols for an outline view of all reactive declarations and structural elements in your HTML file. Symbols appear in the **Outline** panel and can be navigated via **Cmd+Shift+O** (macOS) / **Ctrl+Shift+O** (Windows/Linux).

---

## Symbol Types

Each No.JS construct maps to a specific VS Code symbol kind:

| Attribute / Element | Symbol Kind | Label Format |
|---------------------|-------------|--------------|
| `state` | Variable | `state: { count: 0 }` |
| `store` | Module | `store: auth` |
| `ref` | Field | `ref: emailInput` |
| `computed` | Property | `computed: fullName` |
| `watch` | Event | `watch: items.length` |
| `<template id="...">` | Class | `template: user-card` |
| `route-view` / `<route-view>` | Namespace | `route-view: /pages` |
| `get`, `post`, `put`, `patch`, `delete` | Function | `GET /api/users → data` |

For `state` declarations, the value is truncated to 50 characters in the symbol label. HTTP method symbols include the `as` alias when present (e.g., `GET /api/users → users`).

---

## Example

Given this HTML file:

```html
<div state="{ count: 0, name: '' }">
  <div store="auth" state="{ user: null }"></div>

  <input ref="nameInput" type="text" model="name" />

  <div computed="fullName: firstName + ' ' + lastName"></div>
  <div watch="count"></div>

  <div get="/api/users" as="users">
    <ul>
      <li each="user in users" bind="user.name"></li>
    </ul>
  </div>

  <template id="loading-spinner">
    <p>Loading…</p>
  </template>

  <route-view src="/pages"></route-view>
</div>
```

The **Outline** panel displays:

```
▸ state: { count: 0, name: '' }          (Variable)
▸ store: auth                             (Module)
▸ state: { user: null }                   (Variable)
▸ ref: nameInput                          (Field)
▸ computed: fullName: firstName + ' ' …   (Property)
▸ watch: count                            (Event)
▸ GET /api/users → users                  (Function)
▸ template: loading-spinner               (Class)
▸ route-view: /pages                      (Namespace)
```

---

## Usage

- **Outline panel:** Open the Explorer sidebar → **Outline** section to see all symbols in the current file.
- **Go to Symbol:** Press **Cmd+Shift+O** / **Ctrl+Shift+O** to open the quick-pick symbol list. Type to filter.
- **Breadcrumbs:** Symbols appear in the editor breadcrumb bar for quick navigation.

---

## Related

- [Go to Definition](go-to-definition.md) — jump to template, ref, or store declarations
- [Find References](references.md) — find all usages of a declaration
