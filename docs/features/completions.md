# Completions

The No.JS LSP provides context-aware completions for all framework features — directives, filters, validators, animations, context keys, event modifiers, i18n keys, routes, stores, and more. Completions appear automatically as you type in HTML attribute names and values.

## Trigger Characters

Completions activate on these characters:

| Character | Context |
|-----------|---------|
| `-` | Dynamic directives: `bind-`, `class-`, `style-` |
| `:` | Event bindings: `on:click`, filter arguments: `truncate:100` |
| `.` | Event modifiers: `on:click.prevent` |
| `\|` | Filters in expressions: `name \| uppercase` |
| `$` | Context keys: `$store`, `$refs`, `$route` |
| `=` | Attribute value start |
| `"` `'` | Inside attribute values |

---

## Directive Completions

When typing an attribute name, the LSP suggests all 39 built-in directives grouped by category. Each item shows its category, description, and inserts a value placeholder for directives that require one.

```html
<!-- Type "st" to see: state, store, style-* -->
<div state="{ count: 0 }">

<!-- Type "ge" to see: get -->
<div get="/api/users" as="users">
```

### Directives by Category

#### State

| Directive | Value | Description |
|-----------|-------|-------------|
| `state` | Object literal | Declares reactive state on the element |
| `store` | Store name | Declares a named global store (`$store.name`) |
| `computed` | Property name | Declares a computed property |
| `watch` | Expression | Watches an expression for changes |

#### HTTP

| Directive | Value | Description |
|-----------|-------|-------------|
| `get` | URL | HTTP GET request |
| `post` | URL | HTTP POST request |
| `put` | URL | HTTP PUT request |
| `patch` | URL | HTTP PATCH request |
| `delete` | URL | HTTP DELETE request |
| `call` | URL | HTTP call triggered by user action |
| `base` | URL | Base URL for descendant fetch directives |

#### Binding

| Directive | Value | Description |
|-----------|-------|-------------|
| `bind` | Expression | Binds text content to an expression |
| `bind-html` | Expression | Binds innerHTML to an expression |
| `model` | Variable path | Two-way data binding for form elements |

#### Conditional

| Directive | Value | Description |
|-----------|-------|-------------|
| `if` | Boolean expression | Conditionally renders the element |
| `else-if` | Boolean expression | Conditional branch after `if` |
| `else` | *(none)* | Fallback branch after `if` or `else-if` |
| `show` | Boolean expression | Toggles visibility via CSS `display` |
| `hide` | Boolean expression | Hides element when expression is truthy |
| `switch` | Expression | Switch statement container |
| `case` | String value | Case inside a `switch` block |
| `default` | *(none)* | Default case in a `switch` block |

#### Loop

| Directive | Value | Description |
|-----------|-------|-------------|
| `each` | `"item in list"` | Loops over a collection |
| `foreach` | Item variable name | Alternative loop with filter, sort, limit, offset |

#### Event

| Directive | Value | Description |
|-----------|-------|-------------|
| `trigger` | Event name | Dispatches a custom event |

#### Reference

| Directive | Value | Description |
|-----------|-------|-------------|
| `ref` | Identifier | Declares a named element reference (`$refs.name`) |

#### Template

| Directive | Value | Description |
|-----------|-------|-------------|
| `use` | Template ID | Inserts a `<template>` by ID |
| `include` | Template ID | Clones an inline template |

#### Form

| Directive | Value | Description |
|-----------|-------|-------------|
| `validate` | Validator rules | Form/field validation |

#### Error

| Directive | Value | Description |
|-----------|-------|-------------|
| `error-boundary` | Template ID | Error handling with fallback template |

#### i18n

| Directive | Value | Description |
|-----------|-------|-------------|
| `t` | Translation key | i18n translation |
| `i18n-ns` | Namespace path | Sets i18n namespace for children |

#### Drag & Drop

| Directive | Value | Description |
|-----------|-------|-------------|
| `drag` | Expression | Makes element draggable |
| `drop` | Statement | Makes element a drop target |
| `drag-list` | List path | Sortable list with drag and drop |
| `drag-multiple` | *(none)* | Enables multi-select drag |

#### Routing

| Directive | Value | Description |
|-----------|-------|-------------|
| `route` | Path pattern | Route link or route definition |
| `route-view` | Outlet name | Route rendering outlet |
| `guard` | Boolean expression | Route guard |

For full directive reference, see [Directives](../reference/directives.md).

---

## Dynamic Pattern Completions

Pattern-based directives use a prefix followed by a dynamic suffix. The LSP suggests common targets for each pattern.

### `bind-*` — Attribute Binding

Suggests 14 common binding targets:

| Completion | Description |
|------------|-------------|
| `bind-href` | Link URL |
| `bind-src` | Image/script source |
| `bind-class` | CSS class |
| `bind-title` | Element title |
| `bind-alt` | Alt text |
| `bind-placeholder` | Input placeholder |
| `bind-action` | Form action |
| `bind-value` | Input value |
| `bind-disabled` | Boolean: disabled |
| `bind-readonly` | Boolean: readonly |
| `bind-checked` | Boolean: checked |
| `bind-selected` | Boolean: selected |
| `bind-hidden` | Boolean: hidden |
| `bind-required` | Boolean: required |

```html
<!-- Type "bind-" to see all common targets -->
<a bind-href="profileUrl">Profile</a>
<img bind-src="avatarUrl" bind-alt="user.name">
<button bind-disabled="!isValid">Submit</button>
```

### `class-*` — Conditional CSS Classes

Inserts a snippet with a dynamic class name and value placeholder. Includes sub-behaviors:

| Completion | Description |
|------------|-------------|
| `class-…` | Conditional class: `class-active="isActive"` |
| `class-map` | Object → classes: `class-map="{ active: isActive }"` |
| `class-list` | Array → classes: `class-list="['base', condition ? 'a' : 'b']"` |

```html
<div class-active="isActive">
<div class-map="{ active: isActive, hidden: !show }">
<div class-list="['base', isActive ? 'active' : '']">
```

### `style-*` — Dynamic CSS Styles

Inserts a snippet with a dynamic style property and value placeholder. Includes sub-behavior:

| Completion | Description |
|------------|-------------|
| `style-…` | Style property: `style-color="textColor"` |
| `style-map` | Object → styles: `style-map="{ color: c, fontSize: s }"` |

```html
<div style-color="textColor">
<div style-font-size="fontSize + 'px'">
<div style-map="{ color: textColor, fontSize: size + 'px' }">
```

### `on:*` — Event Handlers

Suggests 25 common DOM events plus 5 lifecycle events:

**DOM Events:**

`click`, `submit`, `input`, `change`, `focus`, `blur`, `keydown`, `keyup`, `keypress`, `mouseenter`, `mouseleave`, `mouseover`, `mouseout`, `mousedown`, `mouseup`, `dblclick`, `contextmenu`, `wheel`, `scroll`, `resize`, `load`, `error`, `touchstart`, `touchend`, `touchmove`

**Lifecycle Events:**

`mounted`, `init`, `updated`, `unmounted`, `error`

```html
<!-- Type "on:" to see all events -->
<button on:click="count++">
<form on:submit.prevent="handleSubmit()">
<div on:mounted="initChart()">
```

---

## Companion Attribute Completions

When a directive is already present on an element, the LSP suggests its companion attributes. Companions are context-aware — they only appear when their parent directive exists.

```html
<!-- After typing "get" and its value, companions like "as", "loading", "error" appear -->
<div get="/api/users" as="users" loading="spinner-tpl">
```

### Companion Map

| Parent Directive | Companions |
|-----------------|------------|
| `state` | `persist`, `persist-key` |
| `store` | `value` |
| `computed` | `expr` |
| `watch` | `on:change` |
| `get` | `as`, `loading`, `error`, `empty`, `success`, `then`, `redirect`, `confirm`, `refresh`, `cached`, `body`, `headers`, `var`, `into`, `retry`, `retry-delay`, `params`, `debounce` |
| `post`, `put`, `patch`, `delete` | *(same as `get`)* |
| `call` | `method`, `as`, `loading`, `into`, `success`, `error`, `then`, `redirect`, `confirm`, `body`, `headers` |
| `if` | `then`, `else`, `animate-enter`, `animate`, `animate-leave`, `transition`, `animate-duration` |
| `else-if` | `then` |
| `else` | `then` |
| `show` | `animate-enter`, `animate`, `animate-leave`, `transition`, `animate-duration` |
| `hide` | `animate-enter`, `animate`, `animate-leave`, `transition`, `animate-duration` |
| `case` | `then` |
| `default` | `then` |
| `each` | `template`, `else`, `key`, `animate-enter`, `animate`, `animate-leave`, `animate-stagger`, `animate-duration` |
| `foreach` | `from`, `index`, `else`, `filter`, `sort`, `limit`, `offset`, `template`, `animate-enter`, `animate`, `animate-leave`, `animate-stagger`, `animate-duration` |
| `trigger` | `trigger-data` |
| `use` | `var-*` |
| `validate` | `error`, `error-*`, `error-class`, `validate-on`, `validate-if`, `as`, `success` |
| `t` | `t-html` |
| `drag` | `drag-type`, `drag-effect`, `drag-handle`, `drag-image`, `drag-image-offset`, `drag-disabled`, `drag-class`, `drag-ghost-class`, `drag-group` |
| `drop` | `drop-accept`, `drop-effect`, `drop-class`, `drop-reject-class`, `drop-disabled`, `drop-max`, `drop-sort`, `drop-placeholder`, `drop-placeholder-class` |
| `drag-list` | `template`, `drag-list-key`, `drag-list-item`, `drop-sort`, `drag-type`, `drop-accept`, `drag-list-copy`, `drag-list-remove`, `drag-disabled`, `drop-disabled`, `drop-max`, `drop-placeholder`, `drop-placeholder-class`, `drag-class`, `drop-class`, `drop-reject-class`, `drop-settle-class`, `drop-empty-class` |
| `drag-multiple` | `drag-group`, `drag-multiple-class` |
| `route` | `route-active`, `route-active-exact`, `lazy`, `outlet` |
| `route-view` | `src`, `ext`, `route-index`, `i18n-ns`, `transition` |
| `guard` | `redirect` |

Wildcard companions like `var-*` and `error-*` insert a snippet with a placeholder for the dynamic suffix.

---

## Event Modifiers

After typing a `.` on an `on:*` attribute, the LSP suggests event modifiers. Modifiers are categorized and can be chained.

### Behavioral Modifiers

| Modifier | Description |
|----------|-------------|
| `.prevent` | Calls `event.preventDefault()` |
| `.stop` | Calls `event.stopPropagation()` |
| `.once` | Handler fires only once |
| `.self` | Only triggers if `event.target` is the element itself |

### Timing Modifiers

| Modifier | Description |
|----------|-------------|
| `.debounce` | Debounces the handler |
| `.throttle` | Throttles the handler |

### Key Modifiers

| Modifier | Description |
|----------|-------------|
| `.enter` | Enter key |
| `.escape` | Escape key |
| `.tab` | Tab key |
| `.space` | Space key |
| `.delete` | Delete key |
| `.backspace` | Backspace key |
| `.up` | Arrow up |
| `.down` | Arrow down |
| `.left` | Arrow left |
| `.right` | Arrow right |
| `.ctrl` | Ctrl key held |
| `.alt` | Alt key held |
| `.shift` | Shift key held |
| `.meta` | Meta (Cmd/Win) key held |

```html
<!-- Modifiers are suggested after the dot -->
<form on:submit.prevent="save()">
<input on:keydown.enter="search()">
<button on:click.once.prevent="initialize()">
<input on:input.debounce="fetchSuggestions()">
```

Already-applied modifiers are excluded from suggestions.

---

## Filter Completions

When you type `|` inside an attribute value expression, the LSP suggests all 32 built-in filters plus any custom filters registered in settings.

```html
<!-- Type "|" after an expression to see all filters -->
<span bind="name | uppercase">
<span bind="price | currency:'EUR'">
<span bind="items | where:'active':true | count">
```

### Filters by Category

#### String (9)

`uppercase`, `lowercase`, `capitalize`, `truncate`, `trim`, `stripHtml`, `slugify`, `nl2br`, `encodeUri`

#### Number (5)

`number`, `currency`, `percent`, `filesize`, `ordinal`

#### Collection (9)

`count`, `first`, `last`, `join`, `reverse`, `unique`, `pluck`, `sortBy`, `where`

#### Date (4)

`date`, `datetime`, `relative`, `fromNow`

#### Utility (5)

`default`, `json`, `debug`, `keys`, `values`

For full filter reference with arguments, see [Filters](../reference/filters.md).

### Custom Filters

Filters registered via `nojs.customFilters` in VS Code settings also appear in completions:

```json
{
  "nojs.customFilters": ["myFilter", "formatPhone"]
}
```

---

## Filter Argument Hints

After typing `:` following a filter name, the LSP shows argument hints — the argument name, type, whether it's required, and the default value if optional.

```html
<!-- After typing "truncate:" — shows: length (number), required -->
<span bind="text | truncate:100">

<!-- After typing "truncate:100:" — shows: suffix (string), default: "..." -->
<span bind="text | truncate:100:'…'">

<!-- After typing "currency:" — shows: currency (string), default: "USD" -->
<span bind="price | currency:'EUR'">
```

Argument position tracks per colon — the first `:` shows the first argument, the second `:` shows the second, and so on.

---

## Validator Completions

Inside `validate="..."` attribute values, the LSP suggests all 10 built-in validators plus custom validators from settings.

| Validator | Arguments | Description |
|-----------|-----------|-------------|
| `required` | — | Field must not be empty |
| `email` | — | Valid email address |
| `url` | — | Valid URL |
| `min` | `value` (number) | Minimum numeric value |
| `max` | `value` (number) | Maximum numeric value |
| `minlength` | `length` (number) | Minimum string length |
| `maxlength` | `length` (number) | Maximum string length |
| `pattern` | `regex` (string) | Regex the value must match |
| `step` | `value` (number) | Numeric step constraint |
| `custom` | `expression` | Custom validation function |

```html
<input validate="required|email">
<input validate="required|min:5|max:100">
<input validate="custom:value.length % 2 === 0">
```

Custom validators from settings:

```json
{
  "nojs.customValidators": ["phone", "zipCode"]
}
```

For full validator reference, see [Validators](../reference/validators.md).

---

## Animation Completions

When the cursor is inside `animate`, `animate-enter`, or `animate-leave` attribute values, the LSP suggests all 14 built-in animations.

| Animation | Category |
|-----------|----------|
| `fadeIn` | Fade |
| `fadeOut` | Fade |
| `fadeInUp` | Fade |
| `fadeInDown` | Fade |
| `fadeOutUp` | Fade |
| `fadeOutDown` | Fade |
| `slideInLeft` | Slide |
| `slideInRight` | Slide |
| `slideOutLeft` | Slide |
| `slideOutRight` | Slide |
| `zoomIn` | Zoom |
| `zoomOut` | Zoom |
| `bounceIn` | Bounce |
| `bounceOut` | Bounce |

```html
<div if="isVisible" animate-enter="fadeIn" animate-leave="fadeOut">
<li each="item in items" animate="fadeInUp" animate-stagger="50">
```

For full reference, see [Animations](../reference/animations.md).

---

## Context Key Completions

When typing `$` inside a directive expression value, the LSP suggests context variables. These are available in any reactive expression.

| Key | Description |
|-----|-------------|
| `$watch` | Programmatic watcher API |
| `$notify` | Notify reactive system of changes |
| `$set` | Set deeply nested property reactively |
| `$parent` | Parent context reference |
| `$refs` | Named element references |
| `$store` | Global store access |
| `$route` | Current route info |
| `$router` | Router navigation API |
| `$i18n` | i18n API |
| `$form` | Form validation state |
| `$el` | Current element |
| `$event` | Current event object |
| `$error` | Error boundary error |
| `$rule` | Current validation rule |

```html
<span bind="$store.cart.total | currency">
<a bind-class-active="$route.path === '/home'">
<span if="$form.valid">Ready to submit</span>
```

### Loop Context Variables

Inside `each` or `foreach` loops, these additional variables are available:

`$index`, `$count`, `$first`, `$last`, `$even`, `$odd`

### Event Handler Variables

Inside `on:*` handlers, these variables are available:

`$event`, `$el`

### `$form` Sub-Properties

When typing `$form.` inside expressions, the LSP suggests form context properties:

| Property | Type | Description |
|----------|------|-------------|
| `$form.valid` | `boolean` | All fields pass validation |
| `$form.dirty` | `boolean` | Any field value has changed |
| `$form.touched` | `boolean` | Any field has been focused |
| `$form.pending` | `boolean` | Async validators running |
| `$form.submitting` | `boolean` | Form submission in progress |
| `$form.errors` | `object` | `{ fieldName: errorMessage }` |
| `$form.values` | `object` | `{ fieldName: currentValue }` |
| `$form.fields` | `object` | `{ fieldName: { valid, dirty, touched, error, value } }` |
| `$form.firstError` | `string \| null` | First error message by priority |
| `$form.errorCount` | `number` | Count of errors |
| `$form.reset()` | `function` | Reset form state |

### `$store` Sub-Properties

When typing `$store.` inside expressions, the LSP suggests store names discovered in the workspace. After selecting a store, typing `.` again suggests its properties.

```html
<!-- $store. → suggests "cart", "auth", etc. -->
<!-- $store.cart. → suggests "items", "total", etc. -->
<span bind="$store.cart.total">
```

For full context key reference, see [Context Keys](../reference/context-keys.md).

---

## i18n Key Completions

Inside `t="..."` and `t-html="..."` attribute values, the LSP suggests i18n keys discovered by the workspace scanner from locale JSON files. Each completion shows the key's value and locale.

```html
<!-- Type inside t="" to see discovered keys like "nav.home", "greeting" -->
<span t="nav.home"></span>
<p t-html="welcome.message"></p>
```

Keys are gathered from JSON files in the workspace's locale directories (e.g., `locales/en/*.json`). See [Workspace Scanner](../advanced/workspace-scanner.md) for scanning details.

---

## Route Completions

Inside `route="..."` and `redirect="..."` attribute values, the LSP suggests route paths discovered in the workspace. Completions show the route path and the file it maps to.

A wildcard `*` completion is also offered inside `<template route="">` for catch-all 404 routes.

```html
<!-- Suggests routes like "/", "/about", "/dashboard" -->
<a route="/about">About</a>

<!-- Wildcard for 404 pages -->
<template route="*">
  <h1>Page not found</h1>
</template>
```

See [Workspace Scanner](../advanced/workspace-scanner.md) for how routes are discovered.

---

## Store Property Completions

When an expression contains `$store.`, the LSP suggests store names parsed from `store="..."` declarations across open documents. After selecting a store name, property completions are offered from the store's `value` companion.

```html
<!-- Declaring a store -->
<div store="cart" value="{ items: [], total: 0 }">

<!-- Elsewhere: $store.cart. → suggests "items", "total" -->
<span bind="$store.cart.total | currency">
```

---

## Template Variable Completions

When an element has a `use="templateId"` attribute, the LSP scans the document for `<template id="templateId">` and suggests `var-*` attributes based on the variables used in that template.

```html
<template id="greeting">
  <h1 bind="name"></h1>
  <p bind="message"></p>
</template>

<!-- "var-name" and "var-message" are suggested -->
<div use="greeting" var-name="'World'" var-message="'Hello!'">
```

---

## Custom Directive Completions

The workspace scanner detects custom directives registered via `NoJS.directive()` calls in JavaScript files. These appear in completions with the file path where they were defined.

```js
// app.js
NoJS.directive('tooltip', (el, value) => { /* ... */ });
```

```html
<!-- "tooltip" appears in completions as "Custom directive" -->
<span tooltip="'Click to edit'">Edit</span>
```

---

## Enumerated Value Completions

Several directives offer value completions for known enumerated values:

| Attribute | Context | Values |
|-----------|---------|--------|
| `method` | On elements with HTTP directives | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `lazy` | Route loading strategy | `ondemand`, `priority` |
| `drop-sort` | Drop sort direction | `vertical`, `horizontal`, `grid` |
| `drag-effect` | Drag effect type | `copy`, `move`, `link`, `none` |
| `drop-effect` | Drop effect type | `copy`, `move`, `link`, `none` |
| `validate-on` | Validation trigger | `input`, `blur`, `focusout`, `submit` |

```html
<button call="/api/delete/1" method="DELETE">
<template route="/dashboard" lazy="ondemand">
<ul drop="items.push($drag)" drop-sort="vertical">
```
