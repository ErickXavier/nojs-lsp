# Semantic Highlighting

The No.JS LSP provides semantic token analysis for NoJS directive attributes and expressions. This enhances the default HTML syntax highlighting with framework-aware colorization — directives, filters, context variables, and operators each receive distinct token types.

Semantic highlighting is applied automatically when the LSP server is running. No configuration is required.

---

## How It Works

When you open or edit an HTML file, the LSP parses all elements and their attributes. For each No.JS attribute it finds, it emits semantic tokens that VS Code merges with the default HTML grammar tokens. This gives directives, filters, and special variables their own colors in any color theme that supports semantic highlighting.

---

## Token Types

The LSP emits the following semantic token types:

| Token Type | Applied To | Example |
|------------|-----------|---------|
| `keyword` | Directive names | `state`, `if`, `each`, `get`, `bind` |
| `decorator` | Dynamic prefixes | `bind-`, `on:`, `class-`, `style-` |
| `function` | Filter names | `uppercase`, `currency`, `truncate` |
| `operator` | Pipe separator | `\|` |
| `variable` | Built-in refs | `$store`, `$refs`, `$route`, `$router`, `$i18n`, `$form`, `$parent` |
| `parameter` | Context variables | `$index`, `$count`, `$first`, `$last`, `$event`, `$el` |

### Example

```html
<div state="{ name: 'World' }">
<!--  ^^^^^ keyword.declaration                -->
  <span bind="name | uppercase"></span>
  <!--  ^^^^  keyword            -->
  <!--             ^ operator    -->
  <!--               ^^^^^^^^^ function -->
  <ul each="item in $store.items">
  <!-- ^^^^  keyword              -->
  <!--               ^^^^^^ variable.readonly -->
    <li bind="item.label"></li>
    <!--^^^^  keyword     -->
  </ul>
</div>
```

---

## Token Modifiers

Modifiers refine the token type with additional semantic meaning:

| Modifier | Applied To | Description |
|----------|-----------|-------------|
| `declaration` | `state`, `store`, `ref` | Marks the directive as declaring a new reactive scope |
| `readonly` | `$store`, `$refs`, `$route`, `$router`, `$i18n`, `$form`, `$parent` | Built-in framework references (not user-assignable) |
| `defaultLibrary` | `$index`, `$count`, `$first`, `$last`, `$even`, `$odd`, etc. | Built-in context variables provided by the framework |

---

## Dynamic Prefixes

Dynamic directive prefixes are highlighted as `decorator` tokens, visually separating the prefix from the target attribute name:

| Prefix | Usage |
|--------|-------|
| `bind-` | Attribute binding: `bind-href`, `bind-src`, `bind-class` |
| `class-` | Conditional class toggle: `class-active`, `class-hidden` |
| `style-` | Inline style binding: `style-color`, `style-opacity` |
| `on:` | Event handler binding: `on:click`, `on:input`, `on:keydown` |

```html
<a bind-href="profileUrl">Profile</a>
<!-- ^^^^^ decorator (bind-) -->

<div class-active="isSelected">...</div>
<!--  ^^^^^^ decorator (class-) -->

<button on:click="handleClick">Go</button>
<!--     ^^^ decorator (on:) -->
```

---

## Context Variables

The LSP recognizes two categories of `$`-prefixed variables in directive expressions:

### Framework References (`variable.readonly`)

These are built-in objects injected by the framework:

- `$store` — Global store access
- `$refs` — Named element references
- `$route` — Current route info
- `$router` — Router instance
- `$i18n` — Internationalization service
- `$form` — Form validation state
- `$parent` — Parent context access

### Loop & Event Context (`parameter.defaultLibrary`)

These are contextual variables available inside specific directives:

| Variable | Context |
|----------|---------|
| `$index` | Current iteration index (`each`, `foreach`) |
| `$count` | Total item count in the loop |
| `$first` | `true` on the first iteration |
| `$last` | `true` on the last iteration |
| `$even` | `true` on even-indexed iterations |
| `$odd` | `true` on odd-indexed iterations |
| `$event` | Native DOM event object (`on:*` handlers) |
| `$el` | Current DOM element |
| `$old` | Previous value (`watch` directive) |
| `$new` | New value (`watch` directive) |
| `$error` | Error object (`error` templates) |
| `$rule` | Failed validation rule name |
| `$drag` | Dragged item data (`dnd` directives) |
| `$dragType` | Drag data type |
| `$dragEffect` | Drag effect (copy/move/link) |
| `$dropIndex` | Drop target index |
| `$source` | Drag source element |
| `$target` | Drop target element |

---

## Filter Pipe Highlighting

Inside expression values, the pipe `|` operator and subsequent filter names receive distinct tokens. Only recognized built-in filters are highlighted as `function` — unknown names are left unstyled.

```html
<span bind="price | currency:'USD'"></span>
<!--              ^ operator       -->
<!--                ^^^^^^^^ function -->
```

The LSP correctly handles:

- Nested brackets and parentheses (pipes inside `()`, `[]`, `{}` are ignored)
- String literals (pipes inside quotes are ignored)
- Logical OR `||` (not confused with the filter pipe)

---

## See Also

- [Completions](completions.md) — auto-complete for directives, filters, and context variables
- [Hover Documentation](hover.md) — inline docs on hover
- [Diagnostics](diagnostics.md) — validation warnings for unknown directives
