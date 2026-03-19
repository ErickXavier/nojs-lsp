# Directives Reference

Complete reference for all No.JS directives supported by the LSP. Data sourced from `server/src/data/directives.json`.

**39 exact directives** and **4 dynamic patterns** across 13 categories.

---

## Master Table

### Exact Directives

| Name | Category | Value Type | Requires Value | Has Companions |
|------|----------|------------|:--------------:|:--------------:|
| `state` | state | object | Yes | Yes |
| `store` | state | string | Yes | Yes |
| `computed` | state | string | Yes | Yes |
| `watch` | state | expression | Yes | Yes |
| `get` | http | url | Yes | Yes |
| `post` | http | url | Yes | Yes |
| `put` | http | url | Yes | Yes |
| `patch` | http | url | Yes | Yes |
| `delete` | http | url | Yes | Yes |
| `call` | http | url | Yes | Yes |
| `base` | http | url | Yes | No |
| `bind` | binding | expression | Yes | No |
| `bind-html` | binding | expression | Yes | No |
| `model` | binding | path | Yes | No |
| `if` | conditional | expression | Yes | Yes |
| `else-if` | conditional | expression | Yes | Yes |
| `else` | conditional | none | No | Yes |
| `show` | conditional | expression | Yes | Yes |
| `hide` | conditional | expression | Yes | Yes |
| `switch` | conditional | expression | Yes | No |
| `case` | conditional | string | Yes | Yes |
| `default` | conditional | none | No | Yes |
| `each` | loop | iterable | Yes | Yes |
| `foreach` | loop | string | Yes | Yes |
| `trigger` | event | string | Yes | Yes |
| `ref` | reference | identifier | Yes | No |
| `use` | template | templateId | Yes | Yes |
| `include` | template | templateId | Yes | No |
| `validate` | form | string | Yes | Yes |
| `error-boundary` | error | templateId | Yes | No |
| `t` | i18n | string | Yes | Yes |
| `i18n-ns` | i18n | string | No | No |
| `drag` | dnd | expression | Yes | Yes |
| `drop` | dnd | statement | Yes | Yes |
| `drag-list` | dnd | expression | Yes | Yes |
| `drag-multiple` | dnd | none | No | Yes |
| `route` | routing | string | Yes | Yes |
| `route-view` | routing | string | No | Yes |
| `guard` | routing | expression | Yes | Yes |

### Dynamic Patterns

| Pattern | Category | Value Type | Requires Value |
|---------|----------|------------|:--------------:|
| `bind-*` | binding | expression | Yes |
| `class-*` | styling | expression | Yes |
| `style-*` | styling | expression | Yes |
| `on:*` | event | statement | Yes |

---

## Directives by Category

### State

Directives for declaring reactive state, global stores, computed properties, and watchers.

#### `state`

Declares reactive state on the element. The value is evaluated as a JavaScript object literal.

- **Value type:** object (JS object literal) — required
- **Priority:** 0

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `persist` | boolean | Persist state to localStorage |
| `persist-key` | string | Custom localStorage key |

```html
<div state="{ count: 0, name: 'World' }">
  <span bind="count"></span>
</div>

<!-- With persistence -->
<div state="{ theme: 'light' }" persist persist-key="app-theme">
```

#### `store`

Declares a named global store accessible via `$store.name`.

- **Value type:** string (store name) — required
- **Priority:** 0

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `value` | expression | Initial store data as JS object literal |

```html
<div store="cart" value="{ items: [], total: 0 }">
```

#### `computed`

Declares a computed property that auto-updates when dependencies change.

- **Value type:** string (property name) — required
- **Priority:** 2

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `expr` | expression | Expression to evaluate |

```html
<div computed="fullName" expr="firstName + ' ' + lastName">
```

#### `watch`

Watches an expression for changes and runs a handler.

- **Value type:** expression — required
- **Priority:** 2

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `on:change` | statement | Handler executed on change; receives `$old`, `$new` |

```html
<div watch="count" on:change="console.log($old, $new)">
```

See also: [Watch Handler Variables](#watch-handler-variables).

---

### HTTP

Declarative HTTP request directives. All method directives (`get`, `post`, `put`, `patch`, `delete`) share the same set of companion attributes.

#### `get`

Performs an HTTP GET request and makes response data available.

- **Value type:** url (URL string or expression) — required
- **Priority:** 1

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `as` | identifier | Variable name for response data |
| `loading` | templateId | Template ID shown while loading |
| `error` | templateId | Template ID shown on error |
| `empty` | templateId | Template ID shown when response is empty |
| `success` | templateId | Template ID shown on success |
| `then` | expression | Expression executed on success |
| `redirect` | string | Path to redirect after success |
| `confirm` | string | Confirmation message before request |
| `refresh` | number | Auto-refresh interval in ms |
| `cached` | boolean | Enable response caching |
| `body` | expression | Request body expression |
| `headers` | expression | Custom request headers object |
| `var` | identifier | Variable name for additional data |
| `into` | string | Store name to put response into |
| `retry` | number | Number of retry attempts |
| `retry-delay` | number | Delay between retries in ms |
| `params` | expression | Query parameters object |
| `debounce` | number | Debounce delay in ms |

```html
<div get="/api/users" as="users" loading="spinner-tpl">
  <li each="user in users" bind="user.name">
</div>

<!-- With caching and auto-refresh -->
<div get="/api/status" as="status" cached refresh="5000">
```

#### `post`

Performs an HTTP POST request. Same companions as `get`.

- **Value type:** url — required
- **Priority:** 1

```html
<form post="/api/users" body="{ name, email }" as="result">
```

#### `put`

Performs an HTTP PUT request. Same companions as `get`.

- **Value type:** url — required
- **Priority:** 1

```html
<form put="/api/users/1" body="{ name, email }">
```

#### `patch`

Performs an HTTP PATCH request. Same companions as `get`.

- **Value type:** url — required
- **Priority:** 1

```html
<form patch="/api/users/1" body="{ email }">
```

#### `delete`

Performs an HTTP DELETE request. Same companions as `get`.

- **Value type:** url — required
- **Priority:** 1

```html
<button delete="/api/users/1" confirm="Delete this user?">
```

#### `call`

HTTP call triggered by user action. Supports a `method` companion to specify the HTTP method.

- **Value type:** url (supports interpolation) — required
- **Priority:** 20

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `method` | string | HTTP method (default: get) |
| `as` | identifier | Variable name for response data (default: "data") |
| `loading` | templateId | Template ID shown while loading |
| `into` | string | Store name for response |
| `success` | templateId | Template ID on success |
| `error` | templateId | Template ID on error |
| `then` | expression | Expression on success |
| `redirect` | string | Path to redirect after success |
| `confirm` | string | Confirmation message |
| `body` | expression | Request body expression |
| `headers` | expression | Custom request headers object |

```html
<button call="/api/delete/1" method="delete" confirm="Are you sure?" loading="spinner-tpl">
```

#### `base`

Sets the base URL for all descendant fetch directives (`get`, `post`, `put`, `patch`, `delete`, `call`).

- **Value type:** url — required
- **Priority:** 1

```html
<div base="https://api.example.com/v1">
  <div get="/users" as="users"><!-- fetches https://api.example.com/v1/users --></div>
</div>
```

---

### Binding

Directives for binding data to the DOM — text content, HTML, attributes, and two-way form binding.

#### `bind`

Binds element's text content to a JS expression. Updates reactively.

- **Value type:** expression — required
- **Priority:** 20

```html
<span bind="user.name">
<p bind="items.length + ' items'">
```

#### `bind-html`

Binds element's innerHTML to a JS expression.

- **Value type:** expression (HTML string) — required
- **Priority:** 20

```html
<div bind-html="richContent">
```

#### `model`

Two-way data binding for form elements (INPUT, SELECT, TEXTAREA).

- **Value type:** path (variable path) — required
- **Priority:** 20

```html
<input model="username">
<select model="selectedOption">
<textarea model="message">
```

---

### Conditional

Directives for conditional rendering and visibility toggling.

#### `if`

Conditionally renders the element. Removes from DOM when expression is false.

- **Value type:** expression (boolean) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `then` | templateId | Template ID to render when true |
| `else` | templateId | Template ID to render when false |
| `animate-enter` | animation | Enter animation name |
| `animate` | animation | Enter animation name (alias) |
| `animate-leave` | animation | Leave animation name |
| `transition` | string | CSS transition name |
| `animate-duration` | number | Animation duration in ms |

```html
<div if="isLoggedIn">Welcome!</div>
<div else-if="isGuest">Hello Guest</div>
<div else>Please log in</div>
```

#### `else-if`

Conditional branch after `if`. Must follow a sibling with `if` or `else-if`.

- **Value type:** expression (boolean) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `then` | templateId | Template ID to render when true |

```html
<div else-if="isAdmin">Admin panel</div>
```

#### `else`

Fallback branch after `if` or `else-if`. Must follow a sibling with `if` or `else-if`.

- **Value type:** none — no value needed
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `then` | templateId | Template ID to render |

```html
<div else>Default content</div>
```

#### `show`

Toggles element visibility via CSS `display`. Element stays in DOM.

- **Value type:** expression (boolean) — required
- **Priority:** 20

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `animate-enter` | animation | Enter animation name |
| `animate` | animation | Enter animation name (alias) |
| `animate-leave` | animation | Leave animation name |
| `transition` | string | CSS transition name |
| `animate-duration` | number | Animation duration in ms |

```html
<div show="isVisible">Visible when true</div>
```

#### `hide`

Opposite of `show`. Hides element via CSS `display: none` when true.

- **Value type:** expression (boolean) — required
- **Priority:** 20

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `animate-enter` | animation | Enter animation name |
| `animate` | animation | Enter animation name (alias) |
| `animate-leave` | animation | Leave animation name |
| `transition` | string | CSS transition name |
| `animate-duration` | number | Animation duration in ms |

```html
<div hide="isLoading">Content</div>
```

#### `switch`

Switch statement. Children use `case`, `default`, and `then` attributes.

- **Value type:** expression — required
- **Priority:** 10

```html
<div switch="role">
  <p case="admin">Admin panel</p>
  <p case="user">Dashboard</p>
  <p default>Guest view</p>
</div>
```

#### `case`

Switch case. Used inside a `switch` container.

- **Value type:** string (value to match against parent switch expression) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `then` | templateId | Template ID to render |

```html
<p case="admin">Admin panel</p>
<p case="editor" then="editor-tpl"></p>
```

#### `default`

Default case in a `switch` block. Renders when no `case` matches.

- **Value type:** none — no value needed
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `then` | templateId | Template ID to render |

```html
<p default>Guest view</p>
```

---

### Loop

Directives for iterating over collections.

Both `each` and `foreach` expose [loop context variables](#loop-context-variables): `$index`, `$count`, `$first`, `$last`, `$even`, `$odd`.

#### `each`

Loops over an iterable collection using `"item in list"` syntax.

- **Value type:** iterable (`"item in list"` syntax) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `template` | templateId | Template ID for item rendering |
| `else` | templateId | Template ID for empty list |
| `key` | expression | Unique key expression for DOM optimization |
| `animate-enter` | animation | Enter animation name |
| `animate` | animation | Enter animation name (alias) |
| `animate-leave` | animation | Leave animation name |
| `animate-stagger` | number | Stagger delay between items in ms |
| `animate-duration` | number | Animation duration in ms |

```html
<li each="user in users" bind="user.name">

<!-- With key and animations -->
<li each="item in items" key="item.id" animate-enter="fadeIn" animate-stagger="50">
```

#### `foreach`

Alternative loop with more options. Supports inline templates and external templates via the `template` companion.

- **Value type:** string (item variable name) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `from` | path | List path to iterate |
| `index` | identifier | Custom index variable name |
| `else` | templateId | Template ID for empty list |
| `filter` | expression | Filter expression |
| `sort` | string | Property to sort by |
| `limit` | number | Max items to show |
| `offset` | number | Number of items to skip |
| `template` | templateId | Template ID for item rendering |
| `animate-enter` | animation | Enter animation name |
| `animate` | animation | Enter animation name (alias) |
| `animate-leave` | animation | Leave animation name |
| `animate-stagger` | number | Stagger delay between items in ms |
| `animate-duration` | number | Animation duration in ms |

```html
<!-- Inline template -->
<li foreach="user" from="users" bind="user.name">

<!-- With filtering, sorting, and pagination -->
<li foreach="item" from="products" filter="item.price > 10" sort="name" limit="5">

<!-- External template -->
<li foreach="item" from="products" template="item-tpl">
```

---

### Event

Directives for dispatching custom events. For DOM event listeners, see the [`on:*` pattern](#on).

#### `trigger`

Dispatches a custom event.

- **Value type:** string (custom event name) — required
- **Priority:** 20

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `trigger-data` | expression | Event detail data expression |

```html
<button on:click="count++" trigger="countChanged" trigger-data="count">
```

---

### Reference

#### `ref`

Declares a reference to an element, accessible via `$refs.name`.

- **Value type:** identifier — required
- **Priority:** 5

```html
<input ref="emailInput">
<!-- Access: $refs.emailInput.value -->
```

---

### Template

Directives for template inclusion and reuse.

#### `use`

Inserts a `<template>` by ID, optionally passing slot parameters via `var-*` companions.

- **Value type:** templateId — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `var-*` | expression | Slot parameter (pattern: `var-name="expr"`) |

```html
<template id="greeting">
  <h1 bind="name"></h1>
</template>
<div use="greeting" var-name="'World'">
```

#### `include`

Synchronously clones an inline template into the current position. Used on `<template>` elements.

- **Value type:** templateId — required
- **Priority:** 1

```html
<template id="header">
  <h1>My App</h1>
</template>

<template include="header"></template>
```

---

### Form

#### `validate`

Form validation with pristine-aware errors.

On a **form**: creates `$form` context with `valid`, `dirty`, `touched`, `pending`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()`.

On a **field**: standalone validation with error template.

- **Value type:** string (pipe-separated validator rules) — required
- **Priority:** 30

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `error` | string | Error message or template ID (prefix with `#`) |
| `error-*` | string | Per-rule error message or template ID (e.g., `error-required`, `error-email`) |
| `error-class` | string | CSS class(es) applied to invalid fields |
| `validate-on` | string | Validation trigger events (space-separated: `input`, `blur`, `focusout`, `submit`) |
| `validate-if` | expression | Conditional expression; field is only validated when truthy |
| `as` | identifier | Expose per-field validation state as a context variable |
| `success` | templateId | Success template for form |

```html
<form validate="" error-class="is-invalid" validate-on="input blur">
  <input name="email" validate="required|email" error-required="Email is required" />
  <span if="$form.errors.email" bind="$form.errors.email"></span>
  <button bind-disabled="!$form.valid">Submit</button>
</form>
```

Built-in validators: `required`, `email`, `url`, `min`, `max`, `custom`.

---

### Error

#### `error-boundary`

Wraps content with error handling. Shows fallback template on error.

- **Value type:** templateId — required
- **Priority:** 1

```html
<div error-boundary="error-tpl">
  <!-- content that might throw -->
</div>
```

---

### i18n

Directives for internationalization and locale management.

#### `t`

i18n translation. Value is the translation key. Interpolation parameters are passed as `t-{param}` attributes.

- **Value type:** string (translation key) — required
- **Priority:** 20

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `t-html` | boolean | Render translation as HTML |

```html
<span t="greeting">
<span t="welcome" t-name="World">
<div t="content.rich" t-html>
```

#### `i18n-ns`

Sets i18n namespace for child elements. When used without a value on `route-view`, the namespace is auto-detected from the template name.

- **Value type:** string (namespace path) — optional
- **Priority:** 1

```html
<div i18n-ns="dashboard">
  <span t="title"><!-- resolves dashboard.title --></span>
</div>

<!-- Auto-detect namespace from route template -->
<main route-view src="templates/" i18n-ns></main>
```

---

### Drag and Drop

Directives for drag-and-drop interactions.

#### `drag`

Makes an element draggable.

- **Value type:** expression (dragged item value) — required
- **Priority:** 15

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `drag-type` | string | Type identifier for the dragged item |
| `drag-effect` | string | Drag effect (`copy`, `move`, `link`, `none`) |
| `drag-handle` | string | CSS selector for drag handle |
| `drag-image` | string | CSS selector for custom drag image |
| `drag-image-offset` | string | Offset for drag image (`x,y`) |
| `drag-disabled` | expression | Expression to disable dragging |
| `drag-class` | string | CSS class while dragging |
| `drag-ghost-class` | string | CSS class for ghost element |
| `drag-group` | string | Group name for multi-select |

```html
<div drag="item" drag-type="card" drag-class="dragging">
```

#### `drop`

Makes an element a drop target.

- **Value type:** statement (executed on drop) — required
- **Priority:** 15

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `drop-accept` | string | Accepted drag types (comma-separated) |
| `drop-effect` | string | Drop effect (`copy`, `move`, `link`, `none`) |
| `drop-class` | string | CSS class on valid dragover |
| `drop-reject-class` | string | CSS class on invalid dragover |
| `drop-disabled` | expression | Expression to disable dropping |
| `drop-max` | expression | Max items accepted |
| `drop-sort` | string | Sort direction (`vertical`, `horizontal`, `grid`) |
| `drop-placeholder` | string | Placeholder HTML/tag |
| `drop-placeholder-class` | string | CSS class for placeholder |

```html
<div drop="items.push($drag)" drop-accept="card" drop-class="over">
```

See also: [Drop Handler Variables](#drop-handler-variables).

#### `drag-list`

Sortable list with drag-and-drop support.

- **Value type:** expression (list path) — required
- **Priority:** 10

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `template` | templateId | Template ID for items |
| `drag-list-key` | string | Unique key property |
| `drag-list-item` | string | Item variable name in template |
| `drop-sort` | string | Sort direction |
| `drag-type` | string | Type identifier |
| `drop-accept` | string | Accepted drag types |
| `drag-list-copy` | boolean | Copy instead of move |
| `drag-list-remove` | boolean | Remove from source after drag |
| `drag-disabled` | expression | Disable dragging |
| `drop-disabled` | expression | Disable dropping |
| `drop-max` | expression | Max items |
| `drop-placeholder` | string | Placeholder HTML/tag |
| `drop-placeholder-class` | string | Placeholder CSS class |
| `drag-class` | string | CSS class while dragging |
| `drop-class` | string | CSS class on valid dragover |
| `drop-reject-class` | string | CSS class on invalid dragover |
| `drop-settle-class` | string | CSS class during settle animation |
| `drop-empty-class` | string | CSS class when list is empty |

```html
<ul drag-list="items" template="item-tpl" drag-type="card" drag-list-key="id">
```

#### `drag-multiple`

Enables multi-select drag on `drag` elements.

- **Value type:** none — no value needed
- **Priority:** 16

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `drag-group` | string | Group name (required) |
| `drag-multiple-class` | string | CSS class for selected items |

```html
<div drag="item" drag-multiple drag-group="cards" drag-multiple-class="selected">
```

---

### Routing

Directives for SPA navigation — route links, view outlets, and guards.

#### `route`

Turns an `<a>` element into a route link that navigates without page reload. Also used on `<template>` elements to define routes. Use `route="*"` for a catch-all wildcard (404 pages).

- **Value type:** string (route path pattern or `"*"`) — required
- **Priority:** 15

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `route-active` | string | CSS class added when route is active (default: `'active'`) |
| `route-active-exact` | string | CSS class added only on exact path match |
| `lazy` | string | Loading strategy (`priority` or `ondemand`) |
| `outlet` | string | Named route-view outlet target (default: `'default'`) |

```html
<a route="/about">About</a>
<template route="/dashboard" lazy="ondemand" outlet="sidebar">

<!-- Catch-all 404 -->
<template route="*">
  <h1>404</h1>
  <p>Path <code bind="$route.path"></code> not found.</p>
</template>
```

Use `$route.matched` (boolean) to check whether an explicit route matched (`true`) or a wildcard/fallback is rendering (`false`).

#### `route-view`

Route rendering outlet. Displays the template matching the current route.

- **Value type:** string (outlet name) — optional
- **Priority:** 1

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `src` | string | File-based routing folder path |
| `ext` | string | Template file extension (default: `.html`) |
| `route-index` | string | Index template name (default: `'index'`) |
| `i18n-ns` | string | i18n namespace for route templates |
| `transition` | string | CSS transition class prefix for route changes |

```html
<div route-view src="pages" ext=".tpl"></div>

<!-- Named outlet -->
<div route-view="sidebar" src="panels"></div>
```

#### `guard`

Route guard that prevents navigation when the expression is falsy.

- **Value type:** expression (boolean) — required
- **Priority:** 5

**Companions:**

| Name | Type | Description |
|------|------|-------------|
| `redirect` | string | Path to redirect to when guard fails |

```html
<template route="/admin" guard="isLoggedIn" redirect="/login">
  <h1>Admin Panel</h1>
</template>
```

---

## Dynamic Patterns

Dynamic patterns match attribute names by prefix and accept arbitrary suffixes.

### `bind-*`

Dynamically binds an HTML attribute to a JS expression. The suffix is the target attribute name.

- **Category:** binding
- **Value type:** expression — required
- **Priority:** 20

**Common targets:**

`href`, `src`, `class`, `title`, `alt`, `placeholder`, `action`, `value`, `disabled`, `readonly`, `checked`, `selected`, `hidden`, `required`

```html
<a bind-href="url">Link</a>
<img bind-src="imageUrl" bind-alt="imageAlt">
<button bind-disabled="!isValid">Submit</button>
<input bind-placeholder="hint" bind-required="isRequired">
```

Boolean attributes (`disabled`, `readonly`, `checked`, `selected`, `hidden`, `required`) are added/removed based on truthiness.

### `class-*`

Conditionally applies CSS class(es). The suffix is the class name to toggle.

- **Category:** styling
- **Value type:** expression (boolean, object, or array) — required
- **Priority:** 20

**Sub-behaviors:**

| Name | Description |
|------|-------------|
| `class-map` | Object keys become class names where the value is truthy |
| `class-list` | Array of class name strings |

```html
<!-- Toggle single class -->
<div class-active="isActive">

<!-- Object map -->
<div class-map="{ active: isActive, hidden: !show }">

<!-- Array list -->
<div class-list="['base', isActive ? 'active' : '']">
```

### `style-*`

Dynamically sets a CSS style property. The suffix is the kebab-case property name (converted to camelCase internally).

- **Category:** styling
- **Value type:** expression (CSS value) — required
- **Priority:** 20

**Sub-behavior:**

| Name | Description |
|------|-------------|
| `style-map` | Object keys become style properties |

```html
<div style-color="textColor">
<div style-font-size="fontSize + 'px'">
<div style-map="{ color: textColor, fontSize: size + 'px' }">
```

### `on:*`

Listens for DOM events and executes JS statement(s). The suffix is the event name, optionally followed by modifiers separated by `.`.

- **Category:** event
- **Value type:** statement — required
- **Priority:** 20

**Common events:**

`click`, `submit`, `input`, `change`, `focus`, `blur`, `keydown`, `keyup`, `keypress`, `mouseenter`, `mouseleave`, `mouseover`, `mouseout`, `mousedown`, `mouseup`, `dblclick`, `contextmenu`, `wheel`, `scroll`, `resize`, `load`, `error`, `touchstart`, `touchend`, `touchmove`

**Modifiers:**

| Category | Modifiers |
|----------|-----------|
| Behavioral | `.prevent`, `.stop`, `.once`, `.self` |
| Timing | `.debounce`, `.throttle` |
| Key | `.enter`, `.escape`, `.tab`, `.space`, `.delete`, `.backspace`, `.up`, `.down`, `.left`, `.right`, `.ctrl`, `.alt`, `.shift`, `.meta` |

```html
<button on:click="count++">Increment</button>
<form on:submit.prevent="handleSubmit()">
<input on:keydown.enter="search()">
<div on:scroll.throttle="onScroll()">
```

See also: [Event Handler Variables](#event-handler-variables).

---

## Lifecycle Events

Lifecycle attributes execute statements at specific points in an element's lifecycle.

| Event | Description |
|-------|-------------|
| `mounted` | Element has been inserted into the DOM |
| `init` | Element is initialized (before first render) |
| `updated` | Element's reactive data has changed |
| `unmounted` | Element has been removed from the DOM |
| `error` | An error occurred during processing |

```html
<div state="{ data: null }" mounted="data = loadData()" unmounted="cleanup()">
<div updated="console.log('re-rendered')">
```

---

## Context Keys

Built-in context variables available in expressions.

| Key | Description |
|-----|-------------|
| `$watch` | Programmatic watcher registration |
| `$notify` | Manually trigger reactive updates |
| `$set` | Set a reactive property |
| `$parent` | Access parent element's context |
| `$refs` | Map of named element references (via `ref`) |
| `$store` | Access global stores (via `store`) |
| `$route` | Current route info (`path`, `params`, `query`, `matched`) |
| `$router` | Router API (`push()`, `replace()`, `back()`) |
| `$i18n` | i18n API (`locale`, `t()`, `setLocale()`) |
| `$form` | Form validation state (`valid`, `dirty`, `errors`, `reset()`) |
| `$el` | Reference to the current DOM element |
| `$event` | Current DOM event (in event handlers) |
| `$error` | Error object (in error boundaries and `error` lifecycle) |
| `$rule` | Current validation rule name (in custom validators) |

---

## Loop Context Variables

Available inside `each` and `foreach` loops.

| Variable | Type | Description |
|----------|------|-------------|
| `$index` | number | Zero-based index of the current item |
| `$count` | number | Total number of items in the collection |
| `$first` | boolean | `true` if current item is the first |
| `$last` | boolean | `true` if current item is the last |
| `$even` | boolean | `true` if `$index` is even |
| `$odd` | boolean | `true` if `$index` is odd |

```html
<li each="item in items">
  <span bind="($index + 1) + '. ' + item.name"></span>
  <span if="$first" class="badge">First</span>
  <span if="$last" class="badge">Last</span>
</li>
```

---

## Event Handler Variables

Available inside `on:*` event handlers.

| Variable | Type | Description |
|----------|------|-------------|
| `$event` | Event | The native DOM event object |
| `$el` | Element | The element the handler is attached to |

```html
<input on:input="name = $event.target.value">
<button on:click="$el.classList.toggle('active')">
```

---

## Watch Handler Variables

Available inside `watch` → `on:change` handlers.

| Variable | Description |
|----------|-------------|
| `$old` | Previous value of the watched expression |
| `$new` | New value of the watched expression |

```html
<div watch="count" on:change="console.log('Changed from', $old, 'to', $new)">
```

---

## Drop Handler Variables

Available inside `drop` statement handlers.

| Variable | Type | Description |
|----------|------|-------------|
| `$drag` | any | The dragged item's data value |
| `$dragType` | string | The drag type identifier |
| `$dragEffect` | string | The drag effect |
| `$dropIndex` | number | Index where the item was dropped |
| `$source` | Element | The source drag element |
| `$target` | Element | The drop target element |
| `$el` | Element | The drop zone element |

```html
<div drop="items.splice($dropIndex, 0, $drag)" drop-accept="card" drop-sort="vertical">
```

---

## Animations

Built-in animation names for use with `animate-enter`, `animate-leave`, and `animate` companions.

| Animation | Description |
|-----------|-------------|
| `fadeIn` | Fade in (opacity 0 → 1) |
| `fadeOut` | Fade out (opacity 1 → 0) |
| `fadeInUp` | Fade in while sliding up |
| `fadeInDown` | Fade in while sliding down |
| `fadeOutUp` | Fade out while sliding up |
| `fadeOutDown` | Fade out while sliding down |
| `slideInLeft` | Slide in from the left |
| `slideInRight` | Slide in from the right |
| `slideOutLeft` | Slide out to the left |
| `slideOutRight` | Slide out to the right |
| `zoomIn` | Scale up from small |
| `zoomOut` | Scale down to small |
| `bounceIn` | Bounce in with overshoot |
| `bounceOut` | Bounce out with overshoot |

```html
<div if="isVisible" animate-enter="fadeInUp" animate-leave="fadeOutDown" animate-duration="300">

<li each="item in items" animate-enter="slideInLeft" animate-stagger="50">
```
