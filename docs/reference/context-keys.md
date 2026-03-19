# Context Keys Reference

Complete reference for all context keys and special variables available in No.JS expressions. Data sourced from `server/src/data/directives.json` and `server/src/providers/hover.ts`.

**14 context keys**, **6 loop variables**, **2 event handler variables**, **2 watch handler variables**, and **7 drop handler variables**.

---

## Context Keys

Context keys are special `$`-prefixed variables available in No.JS expressions. They provide access to framework features like routing, stores, and DOM references.

| Key | Description |
|-----|-------------|
| `$watch` | Programmatically watch an expression for changes |
| `$notify` | Manually trigger re-evaluation of watchers and bindings |
| `$set` | Imperatively set a reactive state property |
| `$parent` | Reference to the parent component context |
| `$refs` | Access to DOM elements marked with `ref` attribute |
| `$store` | Access to the global reactive store |
| `$route` | Current route information (path, params, query, hash, matched) |
| `$router` | Router instance for programmatic navigation |
| `$i18n` | Internationalization helper for translations |
| `$form` | Form validation state and methods |
| `$el` | Reference to the current DOM element |
| `$event` | The native DOM event object in event handlers |
| `$error` | Error object in error handlers and `error` templates |
| `$rule` | The validation rule name that triggered the error |

### `$watch`

Programmatically watch an expression for changes.

```html
<div state="{ count: 0 }" on:mounted="$watch('count', (old, val) => console.log(old, val))">
  <button on:click="count++">Increment</button>
</div>
```

### `$notify`

Manually trigger re-evaluation of watchers and bindings. Useful after imperatively modifying data that the proxy may not detect.

```html
<button on:click="items.sort(); $notify()">Sort</button>
```

### `$set`

Imperatively set a reactive state property.

```html
<button on:click="$set('name', 'Alice')">Set Name</button>
```

### `$parent`

Reference to the parent component context. Useful for accessing state declared on an ancestor element.

```html
<div state="{ theme: 'dark' }">
  <div state="{ count: 0 }">
    <span bind="$parent.theme"></span>
  </div>
</div>
```

### `$refs`

Access to DOM elements marked with the `ref` attribute.

```html
<input ref="emailInput">
<button on:click="$refs.emailInput.focus()">Focus Email</button>
```

### `$store`

Access to the global reactive store. Store names become sub-properties.

```html
<div store="user" value="{ name: 'Alice', role: 'admin' }"></div>

<!-- Anywhere in the app -->
<span bind="$store.user.name"></span>
<button on:click="$store.user.name = 'Bob'">Rename</button>
```

### `$route`

Current route information object.

**Properties:** `path`, `params`, `query`, `hash`, `matched`

```html
<span bind="$route.path"></span>
<span bind="$route.params.id"></span>
<span bind="$route.query.page"></span>
<div if="!$route.matched">
  <h1>404 — Page Not Found</h1>
</div>
```

### `$router`

Router instance for programmatic navigation.

```html
<button on:click="$router.push('/dashboard')">Go to Dashboard</button>
<button on:click="$router.back()">Back</button>
```

### `$i18n`

Internationalization helper for translations.

```html
<span bind="$i18n.locale"></span>
<button on:click="$i18n.locale = 'es'">Español</button>
```

### `$form`

Form validation state and methods. Available inside `<form validate>` blocks.

**Properties:** `valid`, `dirty`, `touched`, `pending`, `submitting`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()`

```html
<form validate="" on:submit.prevent="submitForm()">
  <input name="email" validate="required|email">
  <span if="$form.errors.email" bind="$form.errors.email"></span>
  <button bind-disabled="!$form.valid">Submit</button>
  <span if="$form.dirty">Unsaved changes</span>
  <button type="button" on:click="$form.reset()">Reset</button>
</form>
```

### `$el`

Reference to the current DOM element.

```html
<div on:click="$el.classList.toggle('active')">Toggle</div>
```

### `$event`

The native DOM event object in event handlers.

```html
<input on:input="name = $event.target.value">
<div on:click="handleClick($event)">Click me</div>
```

### `$error`

Error object available in error handlers and `error` templates.

**Properties:** `message`, `status`

```html
<template id="error-tpl">
  <p bind="$error.message"></p>
  <span bind="$error.status"></span>
</template>

<div get="/api/data" error="error-tpl"></div>
```

### `$rule`

The validation rule name that triggered the error. Available in error templates.

```html
<input validate="required|email" error="#field-error">
<template id="field-error">
  <span if="$rule === 'required'">This field is required</span>
  <span if="$rule === 'email'">Please enter a valid email</span>
</template>
```

---

## Loop Variables

Available inside `each` and `foreach` loops. These provide metadata about the current iteration.

| Variable | Type | Description |
|----------|------|-------------|
| `$index` | number | Zero-based index of the current item |
| `$count` | number | Total number of items in the loop |
| `$first` | boolean | `true` if this is the first item |
| `$last` | boolean | `true` if this is the last item |
| `$even` | boolean | `true` if the current index is even |
| `$odd` | boolean | `true` if the current index is odd |

```html
<ul state="{ users: ['Alice', 'Bob', 'Charlie'] }">
  <li each="user in users">
    <span bind="($index + 1) + '. ' + user"></span>
    <span if="$first"> (first)</span>
    <span if="$last"> (last)</span>
  </li>
</ul>

<!-- Striped table rows -->
<tr foreach="item" from="items"
    class-even-row="$even"
    class-odd-row="$odd">
  <td bind="item.name"></td>
</tr>

<!-- Item count -->
<p bind="'Showing ' + $count + ' items'"></p>
```

---

## Event Handler Variables

Available inside `on:*` event handler expressions.

| Variable | Type | Description |
|----------|------|-------------|
| `$event` | Event | The native DOM event object |
| `$el` | Element | Reference to the current DOM element |

```html
<button on:click="count++; console.log($event.type, $el.tagName)">
  Click me
</button>

<input on:input="search = $event.target.value"
       on:keydown.enter="submitSearch()">

<div on:mousemove="x = $event.clientX; y = $event.clientY">
  <span bind="x + ', ' + y"></span>
</div>
```

---

## Watch Handler Variables

Available inside the `on:change` companion of the `watch` directive.

| Variable | Type | Description |
|----------|------|-------------|
| `$old` | any | Previous value of the watched expression |
| `$new` | any | New value of the watched expression |

```html
<div state="{ count: 0 }"
     watch="count"
     on:change="console.log('Changed from', $old, 'to', $new)">
  <button on:click="count++">Increment</button>
</div>

<!-- Conditional logic on change -->
<div watch="items.length"
     on:change="$new > 10 ? $set('warning', true) : $set('warning', false)">
</div>
```

---

## Drop Handler Variables

Available inside `drop` handler expressions. Provide information about the drag-and-drop operation.

| Variable | Type | Description |
|----------|------|-------------|
| `$drag` | any | The dragged item value (array if multi-select) |
| `$dragType` | string | The `drag-type` of the dragged item |
| `$dragEffect` | string | The `drag-effect` of the drag operation |
| `$dropIndex` | number | Insertion index in the drop zone |
| `$source` | object | Source info: `{ list, index, el }` |
| `$target` | object | Target info: `{ list, index, el }` |
| `$el` | Element | Reference to the drop target element |

```html
<div state="{ inbox: [], archive: [] }">
  <!-- Draggable items -->
  <div each="msg in inbox" drag="msg" drag-type="email">
    <span bind="msg.subject"></span>
  </div>

  <!-- Drop zone -->
  <div drop="archive.push($drag)"
       drop-accept="email"
       drop-class="drop-active">
    <p>Drop emails here to archive</p>
  </div>
</div>

<!-- Using drop index for insertion -->
<div drop="items.splice($dropIndex, 0, $drag)"
     drop-accept="card">
</div>

<!-- Conditional drop based on type -->
<div drop="$dragType === 'task' ? tasks.push($drag) : notes.push($drag)"
     drop-accept="task,note">
</div>
```

---

## See Also

- [Directives Reference](directives.md) — all directives and companions
- [Filters Reference](filters.md) — pipe-based expression transformations
- [Animations Reference](animations.md) — built-in animation names
