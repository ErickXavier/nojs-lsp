# Animations Reference

Complete reference for all built-in animations supported by No.JS. Data sourced from `server/src/data/directives.json`.

**14 built-in animations** and **6 animation companion attributes**.

---

## Built-in Animations

| Animation | Type | Description |
|-----------|------|-------------|
| `fadeIn` | Fade | Fade in from transparent |
| `fadeOut` | Fade | Fade out to transparent |
| `fadeInUp` | Fade | Fade in while sliding up |
| `fadeInDown` | Fade | Fade in while sliding down |
| `fadeOutUp` | Fade | Fade out while sliding up |
| `fadeOutDown` | Fade | Fade out while sliding down |
| `slideInLeft` | Slide | Slide in from the left |
| `slideInRight` | Slide | Slide in from the right |
| `slideOutLeft` | Slide | Slide out to the left |
| `slideOutRight` | Slide | Slide out to the right |
| `zoomIn` | Zoom | Zoom in from smaller scale |
| `zoomOut` | Zoom | Zoom out to smaller scale |
| `bounceIn` | Bounce | Bounce in with elastic effect |
| `bounceOut` | Bounce | Bounce out with elastic effect |

---

## Animation Companion Attributes

These companion attributes control animations on directives that support them.

| Attribute | Type | Description |
|-----------|------|-------------|
| `animate-enter` | animation | Animation played when the element enters the DOM |
| `animate` | animation | Alias for `animate-enter` |
| `animate-leave` | animation | Animation played when the element leaves the DOM |
| `animate-duration` | number | Animation duration in milliseconds |
| `animate-stagger` | number | Stagger delay between items in ms (loops only) |
| `transition` | string | CSS transition class prefix for custom transitions |

---

## Directives That Support Animations

| Directive | `animate-enter` | `animate-leave` | `animate-duration` | `animate-stagger` | `transition` |
|-----------|:---------------:|:---------------:|:------------------:|:-----------------:|:------------:|
| `if` | Yes | Yes | Yes | — | Yes |
| `show` | Yes | Yes | Yes | — | Yes |
| `hide` | Yes | Yes | Yes | — | Yes |
| `each` | Yes | Yes | Yes | Yes | — |
| `foreach` | Yes | Yes | Yes | Yes | — |
| `drag-list` | — | — | — | — | — |
| `route-view` | — | — | — | — | Yes |

> **Note:** `animate` can be used as a shorthand alias for `animate-enter` on any directive that supports enter animations. `animate-stagger` is only available on loop directives (`each`, `foreach`).

---

## Usage

### Conditional Rendering with Animation

The `if`, `show`, and `hide` directives support enter and leave animations:

```html
<!-- Fade in when shown, fade out when hidden -->
<div if="isVisible" animate-enter="fadeIn" animate-leave="fadeOut">
  <p>This content animates in and out.</p>
</div>

<!-- Using the animate shorthand for enter -->
<div show="isOpen" animate="fadeInDown" animate-leave="fadeOutUp">
  <p>Dropdown content</p>
</div>

<!-- With custom duration -->
<div if="showBanner"
     animate-enter="slideInLeft"
     animate-leave="slideOutRight"
     animate-duration="500">
  <p>Promotional banner</p>
</div>
```

### Loop Animations with Stagger

The `each` and `foreach` directives support staggered animations for list items:

```html
<!-- Each item fades in with a 100ms stagger delay -->
<ul state="{ users: [] }">
  <li each="user in users"
      animate-enter="fadeInUp"
      animate-leave="fadeOut"
      animate-stagger="100"
      bind="user.name">
  </li>
</ul>

<!-- foreach with stagger -->
<div foreach="item" from="products"
     animate-enter="zoomIn"
     animate-leave="zoomOut"
     animate-stagger="50"
     animate-duration="300">
  <span bind="item.name"></span>
</div>
```

### Route Transitions

The `route-view` directive supports CSS-based transitions via the `transition` companion:

```html
<main route-view src="pages/" transition="page"></main>
```

This adds CSS classes during route changes: `page-enter`, `page-enter-active`, `page-leave`, `page-leave-active`. Define the transition in CSS:

```css
.page-enter { opacity: 0; transform: translateX(20px); }
.page-enter-active { transition: all 0.3s ease; }
.page-leave-active { transition: all 0.3s ease; }
.page-leave { opacity: 0; transform: translateX(-20px); }
```

### CSS Transitions on Conditionals

The `transition` companion can also be used on `if`, `show`, and `hide` for class-based CSS transitions instead of built-in animations:

```html
<div if="isExpanded" transition="collapse">
  <p>Collapsible content</p>
</div>
```

```css
.collapse-enter { max-height: 0; overflow: hidden; }
.collapse-enter-active { transition: max-height 0.3s ease; max-height: 500px; }
.collapse-leave-active { transition: max-height 0.3s ease; }
.collapse-leave { max-height: 0; overflow: hidden; }
```

---

## Animation vs. Transition

| Feature | `animate-enter` / `animate-leave` | `transition` |
|---------|----------------------------------|--------------|
| Type | Built-in keyframe animations | CSS class-based transitions |
| Customization | Duration via `animate-duration` | Full CSS control |
| Stagger support | Yes (loops only) | No |
| Use case | Quick, predefined effects | Custom, complex transitions |

Use built-in animations for common effects. Use `transition` when you need full CSS control over enter/leave behavior.

---

## See Also

- [Directives Reference](directives.md) — all directives and their companions
- [Context Keys Reference](context-keys.md) — special variables in expressions
- [Configuration Reference](configuration.md) — extension settings
