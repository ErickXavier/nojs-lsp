# Snippets

The No.JS extension ships 23 code snippets for quickly scaffolding common patterns. Type a prefix in an HTML file and press Tab or select from the completion menu to expand the snippet.

All snippets use tab stops (`$1`, `$2`, …) so you can cycle through placeholders with Tab.

---

## Conditionals

### No.JS Conditional Block

**Prefix:** `if`

```html
<div if="condition">
  ...
</div>
```

### No.JS If/Else Block

**Prefix:** `if-else`

```html
<div if="condition">
  <!-- true content -->
</div>
<div else>
  ...
</div>
```

---

## Loops

### No.JS Each Loop

**Prefix:** `each`

```html
<div each="item in items">
  <span bind-text="item."></span>
</div>
```

### No.JS Foreach Loop

**Prefix:** `foreach`

```html
<li foreach="item" from="items">
  <span bind="item."></span>
</li>
```

### No.JS Foreach with Template

**Prefix:** `foreach-template`

```html
<div foreach="item" from="items" template="item-tpl"></div>

<template id="item-tpl">
  <span bind="item."></span>
</template>
```

### No.JS Foreach with Filter/Sort

**Prefix:** `foreach-filter`

```html
<li foreach="item" from="items" filter="item.active" sort="name" limit="10">
  <span bind="item."></span>
</li>
```

---

## HTTP

### No.JS HTTP GET Fetch

**Prefix:** `get`

```html
<div get="/api/endpoint" as="data">
  <span bind-text="data."></span>
</div>
```

### No.JS HTTP GET with States

**Prefix:** `get-full`

```html
<div get="/api/endpoint" as="data">
  ...
</div>

<template id="loading-tpl">
  <p>Loading...</p>
</template>

<template id="error-tpl">
  <p>Error loading data</p>
</template>
```

### No.JS HTTP POST

**Prefix:** `post`

```html
<form post="/api/endpoint" as="result">
  <input name="field" />
  <button type="submit">Submit</button>
</form>
```

### No.JS HTTP Call

**Prefix:** `call`

```html
<button call="/api/endpoint" method="post" as="data" loading="loading-tpl">Submit</button>
```

### No.JS HTTP Call with Confirm

**Prefix:** `call-confirm`

```html
<button call="/api/endpoint" method="delete" confirm="Are you sure?" loading="loading-tpl">Delete</button>
```

---

## State

### No.JS State

**Prefix:** `state`

```html
<div state="{ key: value }">
  ...
</div>
```

### No.JS Store Declaration

**Prefix:** `store`

```html
<div store="myStore" value="{ key: value }">
  ...
</div>
```

### No.JS Config Stores

**Prefix:** `config-stores`

```html
<script>
  NoJS.config({
    stores: {
      storeName: { key: value }
    }
  });
</script>
```

### No.JS Store Notify

**Prefix:** `notify`

```js
NoJS.notify(); // flush DOM bindings after store mutation
```

---

## Forms

### No.JS Form Validation

**Prefix:** `form`

```html
<form state="{ email: '' }" validate="" error-class="is-invalid" on:submit.prevent="handleSubmit">
  <input name="email" model="email" validate="required|email" />
  <span if="$form.errors.email" bind="$form.errors.email"></span>
  <button type="submit" disabled="!$form.valid">Submit</button>
</form>
```

---

## Templates

### No.JS Template

**Prefix:** `template`

```html
<template id="my-template">
  ...
</template>
```

### No.JS Use Template

**Prefix:** `use`

```html
<div use="template-id"></div>
```

---

## Events

### No.JS Event Handler

**Prefix:** `on`

```html
<button on:click="handler">Click me</button>
```

---

## Binding

### No.JS Bind Attribute

**Prefix:** `bind`

```html
<div bind-text="expression"></div>
```

---

## Routing

### No.JS Route View

**Prefix:** `route`

```html
<route-view src="pages/"></route-view>
```

### NoJS: 404 Catch-All Route

**Prefix:** `nojs-route-404`

```html
<template route="*">
  <h1>404 — Page Not Found</h1>
  <p>The page <code bind="$route.path"></code> does not exist.</p>
  <a route="/">Go Home</a>
</template>
```

---

## i18n

### No.JS i18n

**Prefix:** `t`

```html
<span t="key">fallback</span>
```

---

## See Also

- [Completions](completions.md) — context-aware auto-complete for directives and values
- [Hover Documentation](hover.md) — inline docs for any directive
- [Semantic Highlighting](semantic-highlighting.md) — color-coded directives and expressions
