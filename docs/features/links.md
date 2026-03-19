# Document Links

The No.JS LSP detects URLs and file paths in directive attributes and renders them as clickable links. Links appear underlined in the editor and can be opened with **Cmd+Click** (macOS) / **Ctrl+Click** (Windows/Linux).

---

## Link Types

### HTTP Directive URLs

URLs in HTTP directive attributes (`get`, `post`, `put`, `patch`, `delete`) are rendered as clickable links when they start with `http://`, `https://`, or `/`.

```html
<!-- "https://api.example.com/users" is a clickable link -->
<div get="https://api.example.com/users" as="users">
  <li each="user in users" bind="user.name"></li>
</div>

<!-- "/api/posts" is also linkable -->
<div post="/api/posts" body="{ title, content }"></div>
```

Each link tooltip shows the HTTP method: **GET https://api.example.com/users**.

### `call` Directive URLs

URLs in the `call` attribute are also rendered as clickable links.

```html
<!-- "/api/cart/add" is a clickable link -->
<button call="/api/cart/add" body="{ productId }">Add to Cart</button>
```

The tooltip displays: **CALL /api/cart/add**.

### Template and Route View `src` Paths

The `src` attribute on `<template>`, `<route-view>`, and elements with a `route-view` attribute is rendered as a file link, allowing you to open the referenced file or directory directly.

```html
<!-- "components/header.html" is a clickable file link -->
<template src="components/header.html"></template>

<!-- "/pages" opens the pages directory -->
<route-view src="/pages"></route-view>
```

Expression values (starting with `$` or `{`) are excluded since they resolve dynamically at runtime.

### `redirect` Attribute URLs

URLs and paths in the `redirect` attribute are clickable when they start with `http://`, `https://`, or `/`.

```html
<form post="/api/login" redirect="/dashboard">
  <!-- "/dashboard" is a clickable link -->
</form>

<div get="/api/auth/check" redirect="https://login.example.com">
  <!-- Full URL is also clickable -->
</div>
```

The tooltip displays: **Redirect to /dashboard**.

---

## Summary

| Attribute | Condition | Tooltip |
|-----------|-----------|---------|
| `get`, `post`, `put`, `patch`, `delete` | URL starts with `http(s)://` or `/` | `METHOD url` |
| `call` | URL starts with `http(s)://` or `/` | `CALL url` |
| `src` (on `template`, `route-view`) | Not an expression (`$`, `{`) | `Open: path` |
| `redirect` | URL starts with `http(s)://` or `/` | `Redirect to url` |

---

## Related

- [Go to Definition](go-to-definition.md) — jump to template, ref, or store definitions
- [Completions](completions.md) — auto-complete directive attributes and values
