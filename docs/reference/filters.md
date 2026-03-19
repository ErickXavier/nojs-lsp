# Filters Reference

Complete reference for all No.JS filters supported by the LSP. Data sourced from `server/src/data/filters.json`.

**32 built-in filters** across 5 categories.

Filters are pipe-based transformations applied to expressions using the `|` operator:

```html
<span bind="value | filterName:arg1:arg2"></span>
```

Filters can be chained — each filter receives the output of the previous one:

```html
<span bind="name | trim | capitalize"></span>
```

---

## Master Table

| Name | Category | Description |
|------|----------|-------------|
| `uppercase` | string | Converts string to UPPERCASE |
| `lowercase` | string | Converts string to lowercase |
| `capitalize` | string | Capitalizes first letter of string |
| `truncate` | string | Truncates string to given length |
| `trim` | string | Removes leading and trailing whitespace |
| `stripHtml` | string | Strips HTML tags from string |
| `slugify` | string | Converts string to URL-friendly slug |
| `nl2br` | string | Converts newlines to `<br>` tags |
| `encodeUri` | string | Encodes string as URI component |
| `number` | number | Formats number with locale formatting |
| `currency` | number | Formats number as currency |
| `percent` | number | Formats number as percentage |
| `filesize` | number | Formats bytes as human-readable file size |
| `ordinal` | number | Converts number to ordinal string (1st, 2nd, 3rd...) |
| `count` | collection | Returns length/count of array or string |
| `first` | collection | Returns first element of array |
| `last` | collection | Returns last element of array |
| `join` | collection | Joins array elements into a string |
| `reverse` | collection | Reverses array or string |
| `unique` | collection | Returns unique values from array |
| `pluck` | collection | Extracts a property from each item in array |
| `sortBy` | collection | Sorts array by property |
| `where` | collection | Filters array by property value |
| `date` | date | Formats date value |
| `datetime` | date | Formats date with time |
| `relative` | date | Converts date to relative time string |
| `fromNow` | date | Converts date to "time from now" string |
| `default` | utility | Returns fallback value if input is null/undefined/empty |
| `json` | utility | Converts value to JSON string |
| `debug` | utility | Logs value to console and returns it |
| `keys` | utility | Returns object keys as array |
| `values` | utility | Returns object values as array |

---

## Filters by Category

### String

Filters for transforming and formatting text values.

#### `uppercase`

Converts string to UPPERCASE.

```html
<span bind="name | uppercase"></span>
```

#### `lowercase`

Converts string to lowercase.

```html
<span bind="name | lowercase"></span>
```

#### `capitalize`

Capitalizes first letter of string.

```html
<span bind="name | capitalize"></span>
```

#### `truncate`

Truncates string to given length.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `length` | number | Yes | — |
| `suffix` | string | No | `...` |

```html
<span bind="text | truncate:100:'…'"></span>
```

#### `trim`

Removes leading and trailing whitespace.

```html
<span bind="input | trim"></span>
```

#### `stripHtml`

Strips HTML tags from string.

```html
<span bind="content | stripHtml"></span>
```

#### `slugify`

Converts string to URL-friendly slug.

```html
<span bind="title | slugify"></span>
```

#### `nl2br`

Converts newlines to `<br>` tags.

```html
<span bind-html="text | nl2br"></span>
```

#### `encodeUri`

Encodes string as URI component.

```html
<a bind-href="'/search?q=' + (query | encodeUri)">Search</a>
```

---

### Number

Filters for formatting numeric values.

#### `number`

Formats number with locale formatting.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `decimals` | number | No | — |
| `locale` | string | No | — |

```html
<span bind="price | number:2"></span>
```

#### `currency`

Formats number as currency.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `currency` | string | No | `USD` |
| `locale` | string | No | — |

```html
<span bind="price | currency:'EUR'"></span>
```

#### `percent`

Formats number as percentage.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `decimals` | number | No | — |

```html
<span bind="ratio | percent:1"></span>
```

#### `filesize`

Formats bytes as human-readable file size.

```html
<span bind="bytes | filesize"></span>
```

#### `ordinal`

Converts number to ordinal string (1st, 2nd, 3rd...).

```html
<span bind="position | ordinal"></span>
```

---

### Collection

Filters for working with arrays and lists.

#### `count`

Returns length/count of array or string.

```html
<span bind="items | count"></span>
```

#### `first`

Returns first element of array.

```html
<span bind="items | first"></span>
```

#### `last`

Returns last element of array.

```html
<span bind="items | last"></span>
```

#### `join`

Joins array elements into a string.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `separator` | string | No | `, ` |

```html
<span bind="tags | join:', '"></span>
```

#### `reverse`

Reverses array or string.

```html
<span bind="items | reverse"></span>
```

#### `unique`

Returns unique values from array.

```html
<span bind="items | unique"></span>
```

#### `pluck`

Extracts a property from each item in array.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `key` | string | Yes | — |

```html
<span bind="users | pluck:'name'"></span>
```

#### `sortBy`

Sorts array by property.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `key` | string | Yes | — |
| `direction` | string | No | `asc` |

```html
<!-- Ascending (default) -->
<ul each="users | sortBy:'name'">...</ul>

<!-- Descending -->
<ul each="users | sortBy:'age':'desc'">...</ul>
```

#### `where`

Filters array by property value.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `key` | string | Yes | — |
| `value` | any | Yes | — |

```html
<ul each="users | where:'active':true">...</ul>
```

---

### Date

Filters for formatting date and time values.

#### `date`

Formats date value.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `format` | string | No | — |

```html
<span bind="createdAt | date:'YYYY-MM-DD'"></span>
```

#### `datetime`

Formats date with time.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `format` | string | No | — |

```html
<span bind="createdAt | datetime"></span>
```

#### `relative`

Converts date to relative time string (e.g., "2 hours ago").

```html
<span bind="createdAt | relative"></span>
```

#### `fromNow`

Converts date to "time from now" string (e.g., "in 3 days").

```html
<span bind="createdAt | fromNow"></span>
```

---

### Utility

General-purpose filters for debugging, fallback values, and object introspection.

#### `default`

Returns fallback value if input is null, undefined, or empty.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `fallback` | any | Yes | — |

```html
<span bind="name | default:'Anonymous'"></span>
```

#### `json`

Converts value to JSON string.

| Argument | Type | Required | Default |
|----------|------|:--------:|---------|
| `indent` | number | No | — |

```html
<pre bind="data | json:2"></pre>
```

#### `debug`

Logs value to console and returns it unchanged. Useful for inspecting intermediate values in a filter chain.

```html
<span bind="data | debug"></span>
```

#### `keys`

Returns object keys as array.

```html
<ul each="obj | keys">
  <li bind="$item"></li>
</ul>
```

#### `values`

Returns object values as array.

```html
<ul each="obj | values">
  <li bind="$item"></li>
</ul>
```

---

## Chaining Filters

Filters can be chained using multiple `|` operators. Each filter receives the output of the previous one, left to right:

```html
<!-- Trim whitespace, then capitalize -->
<span bind="name | trim | capitalize"></span>

<!-- Get active users, sort by name, pluck emails, join as comma-separated string -->
<span bind="users | where:'active':true | sortBy:'name' | pluck:'email' | join:', '"></span>

<!-- Format with fallback -->
<span bind="bio | truncate:200 | default:'No bio provided'"></span>
```

---

## Custom Filters

The LSP supports user-defined filters via the `nojs.customFilters` workspace setting. Custom filters appear in completions alongside built-in filters.

```jsonc
// .vscode/settings.json
{
  "nojs.customFilters": ["highlight", "markdown", "initials"]
}
```

These names will then appear in filter completions when typing `|` in an expression.

---

## See Also

- [Completions](../features/completions.md) — filter name and argument completions
- [Hover](../features/hover.md) — inline filter documentation on hover
