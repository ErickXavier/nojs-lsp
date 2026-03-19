# Code Actions

The No.JS LSP provides quick fixes that appear as lightbulb suggestions on diagnostics. These code actions offer one-click corrections for common issues detected during validation.

All code actions use `CodeActionKind.QuickFix` and are tied to `nojs` source diagnostics.

---

## Quick Fixes

### 1. Add `as` Companion Attribute

**Trigger:** HTTP directive (`get`, `post`, `put`, `patch`, `delete`, `call`) is missing the `as` companion attribute.

**Diagnostic message:** `No.JS: HTTP directive "get" is missing the "as" companion attribute to bind the response data.`

**Action title:** `No.JS: Add as="data" companion attribute`

The fix inserts `as="data"` immediately after the HTTP directive's value. You can then rename `data` to a meaningful variable name.

**Before:**

```html
<div get="/api/users">
  ...
</div>
```

**After applying fix:**

```html
<div get="/api/users" as="data">
  ...
</div>
```

---

### 2. Did You Mean? (Typo Correction)

**Trigger:** An attribute name is flagged as an unknown directive and is within Levenshtein distance ≤ 2 of one or more known directives.

**Diagnostic message:** `No.JS: Unknown directive "staet". Did you mean one of the known directives?`

**Action title:** `No.JS: Did you mean "state"?`

The fix replaces the misspelled attribute name with the suggested directive. Up to 3 suggestions are offered, ranked by similarity. The closest match is marked as the preferred action.

**Before:**

```html
<div staet="{ count: 0 }"></div>
```

**After applying fix:**

```html
<div state="{ count: 0 }"></div>
```

**Multiple suggestions example:**

For a typo like `bnd`, the lightbulb may offer:

1. **`No.JS: Did you mean "bind"?`** *(preferred)*
2. `No.JS: Did you mean "bind-html"?`

Each suggestion is a separate code action. Selecting one replaces the attribute name.

---

## Related

- [Diagnostics](diagnostics.md) — Validation rules that trigger these code actions
- [Completions](completions.md) — Autocomplete to avoid typos in the first place
- [Hover](hover.md) — Inline documentation for directives and filters
