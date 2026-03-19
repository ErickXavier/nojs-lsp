# Diagnostics

The No.JS LSP validates HTML documents in real time and reports warnings, errors, and hints for incorrect or suspicious usage of No.JS directives, filters, validators, and expressions. Diagnostics appear inline in the editor and in the Problems panel.

All diagnostics use the source identifier `nojs`.

---

## Configuration

Diagnostics can be disabled globally via the `nojs.validation.enabled` setting:

```json
{
  "nojs.validation.enabled": false
}
```

When disabled, the LSP clears all existing diagnostics and skips validation entirely.

---

## Validation Rules

### 1. Unknown Directive

**Severity:** Warning

Flags attribute names that look like No.JS directives but don't match any known directive. The LSP uses Levenshtein distance (≤ 2) to determine if an attribute is likely a misspelled directive.

```html
<!-- ⚠ Warning: Unknown directive "staet". Did you mean one of the known directives? -->
<div staet="{ count: 0 }"></div>
```

```html
<!-- ✓ Correct -->
<div state="{ count: 0 }"></div>
```

Standard HTML attributes are excluded from this check. The LSP also skips attributes that don't resemble any known directive name.

---

### 2. Missing Required Value

**Severity:** Error

Directives marked with `requiresValue: true` in the directive registry must have a non-empty value.

```html
<!-- ✗ Error: Directive "get" requires a value. -->
<div get="" as="data"></div>

<!-- ✗ Error: Directive "bind" requires a value. -->
<span bind></span>
```

```html
<!-- ✓ Correct -->
<div get="/api/users" as="data"></div>
<span bind="user.name"></span>
```

---

### 3. Orphaned `else` / `else-if`

**Severity:** Error

An `else` or `else-if` attribute must appear on an element whose previous sibling has an `if` or `else-if` attribute. If there is no previous sibling, or the sibling lacks the required attribute, an error is reported.

```html
<!-- ✗ Error: "else" must be preceded by a sibling with "if" or "else-if". -->
<div>
  <p>First paragraph</p>
  <p else>Fallback</p>
</div>
```

```html
<!-- ✓ Correct -->
<div>
  <p if="loggedIn">Welcome back!</p>
  <p else>Please log in.</p>
</div>
```

```html
<!-- ✓ Correct chain -->
<div>
  <p if="role === 'admin'">Admin panel</p>
  <p else-if="role === 'editor'">Editor view</p>
  <p else>Read-only</p>
</div>
```

---

### 4. Unknown Filter

**Severity:** Warning

When a directive value contains a pipe `|` operator, the LSP extracts the filter name and checks it against the built-in filter registry. Unknown filter names trigger a warning that lists all available filters.

```html
<!-- ⚠ Warning: Unknown filter "upppercase". Available filters: uppercase, lowercase, ... -->
<span bind="name | upppercase"></span>
```

```html
<!-- ✓ Correct -->
<span bind="name | uppercase"></span>
```

Only names matching `[a-zA-Z][\w-]*` are validated — complex expressions after `|` are skipped.

---

### 5. Invalid Event Modifier

**Severity:** Warning

Event directives (`on:*`) support dot-separated modifiers (e.g., `.prevent`, `.stop`, `.once`). The LSP validates each modifier against the known set of behavioral, timing, and key modifiers.

```html
<!-- ⚠ Warning: Unknown event modifier "prvent". -->
<button on:click.prvent="handleClick()">Click</button>
```

```html
<!-- ✓ Correct -->
<button on:click.prevent="handleClick()">Click</button>
<form on:submit.prevent.once="save()">...</form>
```

---

### 6. Duplicate `state` Declarations

**Severity:** Warning

When the same state property name is declared in multiple `state` attributes across the document, a warning is raised on each occurrence. State keys are extracted from object literals (`{ count: 0 }`) or simple identifiers.

```html
<!-- ⚠ Warning: Duplicate state declaration "count" is declared 2 times. -->
<div state="{ count: 0 }">
  <section state="{ count: 10 }">
  </section>
</div>
```

```html
<!-- ✓ Correct — unique state names -->
<div state="{ count: 0 }">
  <section state="{ total: 10 }">
  </section>
</div>
```

---

### 7. Duplicate `ref` Names

**Severity:** Warning

Each `ref` value must be unique within a document. Duplicate ref names are flagged on every occurrence.

```html
<!-- ⚠ Warning: Duplicate ref "myInput" is declared 2 times. -->
<input ref="myInput" type="text">
<input ref="myInput" type="email">
```

```html
<!-- ✓ Correct -->
<input ref="nameInput" type="text">
<input ref="emailInput" type="email">
```

---

### 8. Duplicate Wildcard Route

**Severity:** Warning

Only one wildcard route (`route="*"`) is allowed per outlet. When multiple `<template>` elements declare `route="*"` for the same outlet, a warning is raised because only the last one will be used.

```html
<!-- ⚠ Warning: Duplicate wildcard route for outlet 'default' — only the last one will be used. -->
<template route="*">
  <p>Not found (first)</p>
</template>
<template route="*">
  <p>Not found (second)</p>
</template>
```

```html
<!-- ✓ Correct — one wildcard per outlet -->
<template route="*">
  <p>Page not found</p>
</template>
```

The outlet is determined by the `outlet` attribute on the same element, defaulting to `"default"`.

---

### 9. Template ID Referenced but Not Defined

**Severity:** Warning

When directives like `use`, `then`, `else`, `loading`, `error`, `empty`, `success`, `template`, or `error-boundary` reference a template by ID, the LSP checks whether a `<template>` with that `id` exists in the same document.

```html
<!-- ⚠ Warning: Template "spinner-tpl" is referenced but not defined in this document. -->
<div get="/api/data" as="data" loading="spinner-tpl"></div>
```

```html
<!-- ✓ Correct -->
<template id="spinner-tpl">
  <p>Loading...</p>
</template>
<div get="/api/data" as="data" loading="spinner-tpl"></div>
```

Only simple identifiers (`[\w-]+`) are checked — expression values are skipped.

---

### 10. Missing `as` Companion for HTTP Directives

**Severity:** Warning

HTTP directives (`get`, `post`, `put`, `patch`, `delete`, `call`) require the `as` companion attribute to bind response data to a variable. If `as` is missing, a warning is raised.

```html
<!-- ⚠ Warning: HTTP directive "get" is missing the "as" companion attribute to bind the response data. -->
<div get="/api/users">
  <p bind="???"></p>
</div>
```

```html
<!-- ✓ Correct -->
<div get="/api/users" as="users">
  <p each="user in users" bind="user.name"></p>
</div>
```

A [quick fix](#related) is available for this diagnostic — see [Code Actions](code-actions.md).

---

### 11. Expression Syntax Validation

**Severity:** Hint

For directives that require a value and accept standard JS expressions, the LSP performs lightweight syntax analysis:

- **Bracket matching** — unmatched `(`, `[`, `{` or unexpected `)`, `]`, `}`
- **Unterminated string literals** — unclosed `'`, `"`, or `` ` ``

```html
<!-- 💡 Hint: Possible syntax error in expression: Expected ')' -->
<span bind="getName(user"></span>
```

```html
<!-- 💡 Hint: Possible syntax error in expression: Unterminated string literal -->
<span bind="'hello"></span>
```

```html
<!-- 💡 Hint: Possible syntax error in expression: Unexpected ')' -->
<span bind="count)"></span>
```

```html
<!-- ✓ Correct -->
<span bind="getName(user)"></span>
<span bind="'hello'"></span>
```

The following patterns are **excluded** from syntax checks to avoid false positives:

- Loop syntax: `item in items`
- Object literals: `{ count: 0 }`
- Array literals: `[1, 2, 3]`
- Simple identifiers: `user.name`
- Quoted strings: `'hello'`
- URL patterns: `/api/users`
- CSS values: `16px`, `1.5rem`
- Validator rules: `required|email|min:5`

Directives that don't use standard JS expressions are also skipped: `validate`, `ref`, `store`, `t`, `i18n-ns`, `trigger`, `error-boundary`, `use`, `drag-handle`, `route`, `on:*` events, and HTTP directives.

---

### 12. `model` on Non-Form Elements

**Severity:** Warning

The `model` directive provides two-way data binding and is designed for form elements. Using it on non-form elements produces a warning.

```html
<!-- ⚠ Warning: "model" is typically used on form elements (input, textarea, select). Found on <div>. -->
<div model="name"></div>
```

```html
<!-- ✓ Correct -->
<input model="name" type="text">
<textarea model="bio"></textarea>
<select model="country">...</select>
```

Valid form elements: `input`, `textarea`, `select`, `option`.

---

### 13. Unknown Animation Name

**Severity:** Warning

The `animate`, `animate-enter`, and `animate-leave` attributes accept animation names from the built-in set. Unknown names (unless prefixed with `custom-`) trigger a warning.

```html
<!-- ⚠ Warning: Unknown animation "fadeInnn". Available: fadeIn, fadeOut, ... -->
<div animate="fadeInnn"></div>
```

```html
<!-- ✓ Correct -->
<div animate="fadeIn"></div>
<div animate="custom-my-animation"></div>
```

---

### 14. Unknown Validator Name

**Severity:** Warning

The `validate` attribute accepts pipe-separated validator rules. Each rule name is checked against the built-in validator registry.

```html
<!-- ⚠ Warning: Unknown validator "emial". Available: required, email, min, max, ... -->
<input validate="required|emial" model="email">
```

```html
<!-- ✓ Correct -->
<input validate="required|email" model="email">
```

---

## Severity Reference

| Severity | Rules | Usage |
|----------|-------|-------|
| **Error** | Missing required value, Orphaned `else`/`else-if` | Definite mistakes that will cause runtime failures |
| **Warning** | Unknown directive, Unknown filter, Invalid modifier, Duplicate state/ref, Duplicate wildcard route, Missing template, Missing `as`, `model` on non-form, Unknown animation, Unknown validator | Likely mistakes or suspicious usage |
| **Hint** | Expression syntax | Possible issues detected by lightweight analysis |

---

## Related

- [Code Actions](code-actions.md) — Quick fixes for diagnostics
- [Completions](completions.md) — Autocomplete to avoid typos
- [Hover](hover.md) — Inline documentation for directives and filters
