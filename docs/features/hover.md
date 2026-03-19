# Hover Documentation

The No.JS LSP provides rich hover information for directives, filters, validators, context keys, loop variables, and more. Hovering over any No.JS attribute or expression token displays inline documentation rendered as Markdown.

---

## Directive Hover

Hovering over a directive attribute name shows its purpose, category, value description, and companion attributes.

### Exact Directives

For exact-match directives (e.g., `state`, `get`, `each`, `if`), the hover displays:

- **Directive name** as a heading
- **Documentation** with description and HTML examples
- **Category** (state, http, binding, conditional, loop, event, etc.)
- **Value** type and whether it's required or optional
- **Companion attributes** with descriptions (when applicable)

**Example — hovering over `get`:**

```markdown
### `get` directive

Performs an HTTP GET request and makes response data available.

**Example:**
​```html
<div get="/api/users" as="users" loading="spinner-tpl">
  <li each="user in users" bind="user.name">
</div>
​```

**Category:** http
**Value:** URL string or expression (required)

**Companion attributes:**
- `as` — Variable name for response data
- `loading` — Template ID shown while loading
- `error` — Template ID shown on error
- `empty` — Template ID shown when response is empty
- `success` — Template ID shown on success
- `then` — Expression executed on success
- `redirect` — Path to redirect after success
- `confirm` — Confirmation message before request
- `refresh` — Auto-refresh interval in ms
- `cached` — Enable response caching
- `body` — Request body expression
- `headers` — Custom request headers object
- `var` — Variable name for additional data
- `into` — Store name to put response into
- `retry` — Number of retry attempts
- `retry-delay` — Delay between retries in ms
- `params` — Query parameters object
- `debounce` — Debounce delay in ms
```

### Pattern Directives

Pattern-based directives (`bind-*`, `on:*`, `class-*`, `style-*`) match by prefix. The hover shows the pattern documentation plus details extracted from the dynamic suffix.

#### `bind-*`

Displays the pattern documentation and the **target attribute** derived from the suffix.

```html
<!-- Hovering over "bind-href" -->
<a bind-href="profileUrl">Profile</a>
```

```markdown
### `bind-*` directive

Dynamically binds an HTML attribute to a JS expression.

**Target attribute:** `href`
```

#### `on:*`

Displays the pattern documentation, the **event name**, and any **modifiers** parsed from the suffix.

```html
<!-- Hovering over "on:submit.prevent" -->
<form on:submit.prevent="handleSubmit()">
```

```markdown
### `on:*` directive

Listens for DOM events and executes JS statement(s).

**Event:** `submit.prevent`
**Modifiers:** `prevent`
```

#### `class-*`

Displays the pattern documentation and the **CSS class** name.

```html
<!-- Hovering over "class-active" -->
<div class-active="isSelected">
```

```markdown
### `class-*` directive

Conditionally applies CSS class(es).

**CSS class:** `active`
```

#### `style-*`

Displays the pattern documentation and the **CSS property** name.

```html
<!-- Hovering over "style-font-size" -->
<div style-font-size="fontSize + 'px'">
```

```markdown
### `style-*` directive

Dynamically sets a CSS style property.

**CSS property:** `font-size`
```

For full directive reference, see [Directives](../reference/directives.md).

---

## Companion Attribute Hover

When a companion attribute is present alongside its parent directive, hovering over the companion shows a description linking it to the parent.

The LSP identifies companions by scanning all directive attributes on the same element, then matching the hovered attribute against each directive's companion list.

```html
<!-- Hovering over "as" -->
<div get="/api/users" as="users">
```

```markdown
No.JS: **`as`** — Companion attribute for `get`

Variable name for response data
```

```html
<!-- Hovering over "persist" -->
<div state="{ count: 0 }" persist>
```

```markdown
No.JS: **`persist`** — Companion attribute for `state`

Persist state to localStorage
```

Companion hover works for all 39 directives and their companion attributes, including wildcard companions like `var-*`, `error-*`, and `t-*`.

---

## Filter Hover

Hovering over a filter name inside a pipe expression (`|`) shows the filter's description, arguments with types and defaults, an example, and its category.

The LSP parses the pipe-separated expression and determines which filter segment the cursor is on.

```html
<!-- Hovering over "truncate" in the expression -->
<span bind="text | truncate:100:'…'">
```

```markdown
### `truncate` filter

Truncates string to given length.

**Arguments:**
- `length`: number (required)
- `suffix`: string (optional, default: ...)

**Example:** `text | truncate:100:'…'`
**Category:** string
```

```html
<!-- Hovering over "currency" -->
<span bind="price | currency:'EUR'">
```

```markdown
### `currency` filter

Formats number as currency.

**Arguments:**
- `currency`: string (optional, default: USD)
- `locale`: string (optional, default: none)

**Example:** `price | currency:'EUR'`
**Category:** number
```

Filters without arguments (e.g., `uppercase`, `trim`, `reverse`) show only the description, example, and category.

For full filter reference, see [Filters](../reference/filters.md).

---

## Validator Hover

Inside `validate="..."` values, hovering over a validator name shows its description and arguments.

```html
<!-- Hovering over "min" in the validate value -->
<input validate="required|min:5|max:100">
```

Validator hover follows the same format as filter hover, displaying the validator name, description, and any required arguments.

For full validator reference, see [Validators](../reference/validators.md).

---

## Context Key Hover

Hovering over a `$`-prefixed context key inside any expression value shows its description and usage examples.

The LSP matches `$word` tokens in the attribute value using regex and maps them against 22 known context keys.

### General Context Keys

| Key | Hover Description |
|-----|-------------------|
| `$refs` | Access to DOM elements marked with `ref` attribute. Usage: `$refs.myInput.focus()` |
| `$store` | Access to the global reactive store. Usage: `$store.user.name` |
| `$route` | Current route information (path, params, query, hash, matched). Usage: `$route.params.id` |
| `$router` | Router instance for programmatic navigation. Usage: `$router.push('/about')` |
| `$i18n` | Internationalization helper for translations. Usage: `$i18n.t('greeting')` |
| `$form` | Form validation state and methods. Properties: `valid`, `dirty`, `touched`, `pending`, `submitting`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()` |
| `$el` | Reference to the current DOM element |
| `$event` | The native DOM event object in event handlers |
| `$parent` | Reference to the parent component context |
| `$watch` | Programmatically watch an expression for changes. Usage: `$watch("expr", callback)` |
| `$notify` | Manually trigger re-evaluation of watchers and bindings |
| `$set` | Imperatively set a reactive state property. Usage: `$set("key", value)` |

### Watch Handler Keys

| Key | Hover Description |
|-----|-------------------|
| `$old` | Previous value in `watch` `on:change` handler |
| `$new` | New value in `watch` `on:change` handler |

### Error Context Keys

| Key | Hover Description |
|-----|-------------------|
| `$error` | Error object in error handlers and `error` templates. Properties: `$error.message`, `$error.status` |
| `$rule` | The validation rule name that triggered the error (e.g., `required`, `email`) |

### Drag & Drop Context Keys

| Key | Hover Description |
|-----|-------------------|
| `$drag` | The dragged item value in `drop` handlers (array if multi-select) |
| `$dragType` | The `drag-type` of the dragged item |
| `$dragEffect` | The `drag-effect` of the drag operation |
| `$dropIndex` | Insertion index in the drop zone |
| `$source` | Source info object `{ list, index, el }` in drop handlers |
| `$target` | Target info object `{ list, index, el }` in drop handlers |

```html
<!-- Hovering over "$store" -->
<span bind="$store.cart.total | currency">
```

```markdown
No.JS: **`$store`** — Access to the global reactive store.

Usage: `$store.user.name`
```

For full context key reference, see [Context Keys](../reference/context-keys.md).

---

## Loop Variable Hover

Inside `each` or `foreach` loop expressions, hovering over loop context variables shows their descriptions.

| Variable | Hover Description |
|----------|-------------------|
| `$index` | Zero-based index of the current item in the loop |
| `$count` | Total number of items in the loop |
| `$first` | `true` if this is the first item in the loop |
| `$last` | `true` if this is the last item in the loop |
| `$even` | `true` if the current index is even |
| `$odd` | `true` if the current index is odd |

```html
<!-- Hovering over "$index" -->
<li each="item in items" bind="$index + ': ' + item.name">
```

```markdown
No.JS: **`$index`** — Zero-based index of the current item in the loop.
```

Loop variables are recognized anywhere in attribute values — the LSP does not require the cursor to be inside a loop element specifically.

---

## Wildcard Route Hover

When hovering over the value `*` in `route="*"` on a `<template>` element, the LSP shows dedicated catch-all route documentation.

```html
<!-- Hovering over the "*" value -->
<template route="*">
  <h1>404</h1>
</template>
```

```markdown
### `route="*"` — Catch-all wildcard route

Matches when **no other route** matches the current path. Used to create custom 404 pages.

**Fallback chain** (per outlet):
1. Local wildcard — `<template route="*" outlet="name">`
2. Global wildcard — `<template route="*">` (default outlet)
3. Built-in generic 404

**`$route.matched`**: `false` when the wildcard renders, `true` for explicit route matches.

​```html
<template route="*">
  <h1>404</h1>
  <p>Path <code bind="$route.path"></code> not found.</p>
</template>
​```
```

This hover only triggers when all three conditions are met: the attribute is `route`, the value is exactly `*`, and the element tag is `template`.

---

## DevTools Bridge Hover

When the No.JS DevTools bridge is connected, the LSP augments `$store` hover with live runtime data. A lightning bolt icon (⚡) indicates live information from the running application.

```html
<!-- With DevTools connected, hovering over "$store" in: -->
<span bind="$store.cart.total">
```

```markdown
No.JS: **`$store`** — Access to the global reactive store.

Usage: `$store.user.name`

---

⚡ **Live** — store `cart`.total (DevTools connected)
```

The bridge extracts the store name and property path from the expression pattern `$store.name.property` and displays a live indicator. This feature requires the No.JS DevTools extension to be running in the browser and connected to the LSP server.

When DevTools is not connected, the hover falls back to the standard `$store` context key documentation.

---

## Animation Value Hover

Hovering over a recognized animation name inside `animate`, `animate-enter`, or `animate-leave` attribute values shows a brief description.

```html
<!-- Hovering over "fadeIn" -->
<div if="isVisible" animate-enter="fadeIn">
```

```markdown
**`fadeIn`** — NoJS built-in animation
```

The 14 built-in animations are: `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`, `fadeOutUp`, `fadeOutDown`, `slideInLeft`, `slideInRight`, `slideOutLeft`, `slideOutRight`, `zoomIn`, `zoomOut`, `bounceIn`, `bounceOut`.
