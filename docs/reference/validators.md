# Validators Reference

Complete reference for all No.JS form validators supported by the LSP. Data sourced from `server/src/data/validators.json`.

**10 built-in validators** for declarative form validation.

Validators are pipe-separated rules applied to form elements via the `validate` attribute:

```html
<input name="email" validate="required|email" />
```

Rules with arguments use a colon separator:

```html
<input name="age" validate="required|min:18|max:120" />
```

Per-field error messages use `error-<rule>` companion attributes:

```html
<input name="email"
       validate="required|email"
       error-required="Email is required"
       error-email="Enter a valid email address" />
```

See also: [Completions](../features/completions.md) · [validate directive](../reference/directives.md#validate)

---

## Master Table

| Name | Description | Arguments | Example |
|------|-------------|-----------|---------|
| `required` | Field must not be empty | — | `validate="required"` |
| `email` | Field must be a valid email address | — | `validate="email"` |
| `url` | Field must be a valid URL | — | `validate="url"` |
| `min` | Minimum numeric value | `value` (number) | `validate="min:5"` |
| `max` | Maximum numeric value | `value` (number) | `validate="max:100"` |
| `minlength` | Minimum string length (native ValidityState) | `length` (number) | `minlength="3"` |
| `maxlength` | Maximum string length (native ValidityState) | `length` (number) | `maxlength="50"` |
| `pattern` | Regex pattern the value must match (native ValidityState) | `regex` (string) | `pattern="[A-Za-z]+"` |
| `step` | Numeric step constraint (native ValidityState) | `value` (number) | `step="0.01"` |
| `custom` | Custom validation function | `expression` (expression) | `validate="custom:value.length % 2 === 0"` |

---

## Validators

### `required`

Field must not be empty. Applies to text inputs, selects, checkboxes, and textareas.

- **Arguments:** none

```html
<input name="username" validate="required" error-required="Username is required" />
```

### `email`

Field must be a valid email address.

- **Arguments:** none

```html
<input name="email" type="email"
       validate="required|email"
       error-email="Please enter a valid email" />
```

### `url`

Field must be a valid URL.

- **Arguments:** none

```html
<input name="website" type="url"
       validate="url"
       error-url="Please enter a valid URL" />
```

### `min`

Minimum numeric value.

- **Arguments:** `value` (number, required) — the minimum allowed value

```html
<input name="age" type="number"
       validate="required|min:18"
       error-min="You must be at least 18" />
```

### `max`

Maximum numeric value.

- **Arguments:** `value` (number, required) — the maximum allowed value

```html
<input name="quantity" type="number"
       validate="required|max:99"
       error-max="Maximum quantity is 99" />
```

### `minlength`

Minimum string length. Uses native ValidityState.

- **Arguments:** `length` (number, required) — the minimum number of characters

```html
<input name="password" type="password"
       validate="required"
       minlength="8"
       error-minlength="Password must be at least 8 characters" />
```

### `maxlength`

Maximum string length. Uses native ValidityState.

- **Arguments:** `length` (number, required) — the maximum number of characters

```html
<textarea name="bio"
          maxlength="500"
          error-maxlength="Bio cannot exceed 500 characters"></textarea>
```

### `pattern`

Regex pattern the value must match. Uses native ValidityState.

- **Arguments:** `regex` (string, required) — a regular expression pattern

```html
<input name="zipcode"
       pattern="[0-9]{5}"
       error-pattern="Enter a 5-digit ZIP code" />
```

### `step`

Numeric step constraint. Uses native ValidityState.

- **Arguments:** `value` (number, required) — the allowed numeric step

```html
<input name="price" type="number"
       step="0.01"
       error-step="Price must be in increments of 0.01" />
```

### `custom`

Custom validation using an expression. The expression receives the field `value` and must return a truthy value to pass.

- **Arguments:** `expression` (expression, required) — a JavaScript expression that evaluates to truthy/falsy

```html
<input name="even" type="number"
       validate="custom:value % 2 === 0"
       error-custom="Value must be an even number" />
```

---

## Companion Attributes

The `validate` directive supports these companion attributes:

| Name | Type | Description |
|------|------|-------------|
| `error` | string | Default error message or template ID (prefix with `#`) |
| `error-*` | string | Per-rule error message or template ID (e.g. `error-required`, `error-email`) |
| `error-class` | string | CSS class(es) applied to invalid fields |
| `validate-on` | string | Validation trigger events (space-separated: `input`, `blur`, `focusout`, `submit`) |
| `validate-if` | expression | Conditional expression; field is only validated when truthy |
| `as` | identifier | Expose per-field validation state as a context variable |
| `success` | templateId | Success template for form |

---

## `$form` Context

When `validate` is placed on a `<form>` element, No.JS creates a `$form` reactive context accessible by all child elements. Use `$form` properties in expressions to build dynamic form UIs.

| Property | Type | Description |
|----------|------|-------------|
| `$form.valid` | boolean | `true` when all fields pass validation |
| `$form.dirty` | boolean | `true` when any field value has changed |
| `$form.touched` | boolean | `true` when any field has been focused |
| `$form.pending` | boolean | `true` when async validation is in progress |
| `$form.errors` | object | Error messages keyed by field name (e.g. `$form.errors.email`) |
| `$form.values` | object | Current field values keyed by field name |
| `$form.fields` | object | Per-field metadata (valid, dirty, touched, errors) |
| `$form.firstError` | string | The first error message across all fields |
| `$form.errorCount` | number | Total number of validation errors |
| `$form.reset()` | function | Resets all fields to initial state, clears errors |

### Usage examples

```html
<!-- Disable submit until valid -->
<button type="submit" bind-disabled="!$form.valid">Submit</button>

<!-- Show error count -->
<span if="$form.errorCount > 0" bind="$form.errorCount + ' error(s)'"></span>

<!-- Display first error -->
<div if="$form.firstError" class="alert" bind="$form.firstError"></div>

<!-- Per-field error display -->
<span if="$form.errors.email" bind="$form.errors.email"></span>

<!-- Reset form -->
<button type="button" on:click="$form.reset()">Reset</button>
```

---

## Custom Validators

Register custom validator names via the `nojs.customValidators` extension setting. This enables LSP completions and suppresses unknown-validator diagnostics for project-specific rules.

```jsonc
// .vscode/settings.json
{
  "nojs.customValidators": ["phone", "postalCode", "strongPassword"]
}
```

Custom validators are then available in `validate` attribute values:

```html
<input name="phone" validate="required|phone" error-phone="Invalid phone number" />
```

---

## Complete Form Example

```html
<form validate="" error-class="is-invalid" validate-on="input blur">
  <div>
    <label>Name</label>
    <input name="name"
           validate="required|minlength:2"
           error-required="Name is required"
           error-minlength="Name must be at least 2 characters" />
    <span if="$form.errors.name" class="error" bind="$form.errors.name"></span>
  </div>

  <div>
    <label>Email</label>
    <input name="email" type="email"
           validate="required|email"
           error-required="Email is required"
           error-email="Enter a valid email address" />
    <span if="$form.errors.email" class="error" bind="$form.errors.email"></span>
  </div>

  <div>
    <label>Password</label>
    <input name="password" type="password"
           validate="required"
           minlength="8"
           error-required="Password is required"
           error-minlength="Password must be at least 8 characters" />
    <span if="$form.errors.password" class="error" bind="$form.errors.password"></span>
  </div>

  <div>
    <label>Age</label>
    <input name="age" type="number"
           validate="required|min:18|max:120"
           error-required="Age is required"
           error-min="You must be at least 18"
           error-max="Maximum age is 120" />
    <span if="$form.errors.age" class="error" bind="$form.errors.age"></span>
  </div>

  <div>
    <label>Website</label>
    <input name="website" type="url"
           validate="url"
           error-url="Enter a valid URL" />
    <span if="$form.errors.website" class="error" bind="$form.errors.website"></span>
  </div>

  <div if="$form.errorCount > 0" class="error-summary">
    <span bind="$form.errorCount + ' error(s) remaining'"></span>
  </div>

  <button type="submit" bind-disabled="!$form.valid">Submit</button>
  <button type="button" on:click="$form.reset()">Reset</button>
</form>
```
