# Workspace Scanner

The workspace scanner indexes your project's file system and open documents to power context-aware [completions](../features/completions.md), hover previews, and diagnostics. It detects i18n keys, file-based routes, store properties, custom directives, and template variables — then caches the results for fast access across all LSP providers.

Source: [`server/src/workspace-scanner.ts`](../../server/src/workspace-scanner.ts)

---

## How It Works

On initialization, the LSP server resolves workspace roots from the client's `workspaceFolders` (or `rootUri` as fallback) and passes them to `setWorkspaceRoots()`. The first call to `getWorkspaceData()` runs all five scanners, caches the combined result, and returns it. Subsequent calls return the cache until it is invalidated.

```
onInitialize → setWorkspaceRoots(roots)
                    ↓
provider call → getWorkspaceData(documents)
                    ↓ (cache miss)
              ┌─────────────────────────┐
              │  scanI18nKeys(root)      │  ← file system
              │  scanRoutes(root)        │  ← file system
              │  scanCustomDirectives()  │  ← file system + documents
              │  scanStoreProperties()   │  ← open documents
              │  scanTemplateVars()      │  ← open documents
              └─────────────────────────┘
                    ↓
              cachedData (returned until invalidated)
```

---

## Scanning Features

### 1. i18n Key Scanning

Scans for `locales/` directories anywhere in the workspace (up to 4 levels deep) and extracts translation keys from JSON files.

**Two layout modes are supported:**

| Mode | Directory Structure | Example Key |
|------|-------------------|-------------|
| Flat | `locales/en.json` | `nav.home` |
| Namespace | `locales/en/common.json` | `common.nav.home` |

Nested JSON objects are recursively flattened to dot-notation keys. For namespace mode, the filename (without `.json`) is prepended as the namespace prefix.

```
locales/
├── en.json                    → keys: "nav.home", "nav.about"
└── en/
    ├── common.json            → keys: "common.nav.home"
    └── errors.json            → keys: "errors.notFound"
```

**Result type:** `I18nKeyInfo` — contains `key`, `value`, `locale`, and `filePath`.

**Feeds into:** `t="..."` attribute value completions and hover previews showing the resolved translation value.

---

### 2. Route Scanning

Scans a `pages/` directory at the workspace root for file-based routes.

**Convention:**

| File | Route Path |
|------|-----------|
| `pages/index.html` | `/` |
| `pages/about.html` | `/about` |
| `pages/blog/index.html` | `/blog` |
| `pages/blog/post.html` | `/blog/post` |

Supported file extensions: `.html`, `.tpl`, `.htm`. The scanner tries `.html` first; if no results are found, it falls back to `.tpl` and `.htm`. Subdirectories are scanned recursively (hidden directories starting with `.` are skipped).

**Result type:** `RouteInfo` — contains `path`, `filePath`, and `fileName`.

**Feeds into:** Route-related attribute value completions (e.g., `path="..."`, `href="..."` in router contexts).

---

### 3. Store Property Scanning

Parses all open documents for store declarations and extracts property names.

**Two detection patterns:**

1. **HTML attributes** — matches `store="name"` paired with `value="{ ... }"` or `state="{ ... }"` on the same element, in either attribute order:

   ```html
   <div store="user" value="{ name: 'Erick', role: 'admin' }">
   <!-- Detected: store "user" with properties ["name", "role"] -->
   ```

2. **Config block** — matches `NoJS.config({ stores: { ... } })` inside `<script>` blocks:

   ```html
   <script>
   NoJS.config({
     stores: {
       cart: { items: [], total: 0 }
     }
   });
   </script>
   <!-- Detected: store "cart" with properties ["items", "total"] -->
   ```

Property extraction parses top-level keys from object literal strings (keys before colons, respecting nesting). Duplicate store names are skipped — the first declaration wins.

**Result type:** `StorePropertyInfo` — contains `storeName` and `properties[]`.

**Feeds into:** `$store.name.property` completions when typing store references in expressions.

---

### 4. Custom Directive Scanning

Detects user-defined directives registered via `NoJS.directive()`.

**Two scan sources:**

1. **JS/TS files on disk** — recursively scans all `.js`, `.mjs`, and `.ts` files in the workspace for `NoJS.directive('name', ...)` calls. Skips `node_modules` and hidden directories. Recursion depth is limited to **5 levels**.

2. **Inline `<script>` blocks** — scans all open HTML documents for the same `NoJS.directive()` pattern.

```js
// src/directives/tooltip.js
NoJS.directive('tooltip', (el, binding) => { ... });
// Detected: custom directive "tooltip"
```

**Result type:** `CustomDirectiveInfo` — contains `name` and `filePath`.

**Feeds into:** Directive name completions, diagnostics (suppresses "unknown directive" warnings for registered custom directives).

---

### 5. Template Variable Scanning

Scans open documents for `<template>` definitions and extracts `var-*` parameter names that can be passed via `use` elements.

**Detection logic:**

1. Finds `<template id="xxx">` elements and reads their `var` attribute (if present).
2. Scans `use="templateId"` elements for `var-*` attributes referencing that template.
3. Collects all unique variable names per template ID.

```html
<template id="card" var="title">
  <div class="card">
    <h2 text="title"></h2>
    <p text="body"></p>
  </div>
</template>

<div use="card" var-title="Hello" var-body="World"></div>
<!-- Detected: template "card" with vars ["title", "body"] -->
```

**Result type:** `TemplateVarInfo` — contains `templateId` and `varNames[]`.

**Feeds into:** `var-*` attribute completions when typing on elements with a `use` attribute.

---

## Cache Invalidation

The scanner uses a single in-memory cache (`cachedData`) that holds all five scan results. The cache is invalidated (set to `null`) in these scenarios:

| Event | Trigger | Effect |
|-------|---------|--------|
| Document saved | `documents.onDidSave()` | `invalidateCache()` — next provider call re-scans |
| Workspace folders changed | `onDidChangeWorkspaceFolders` | `setWorkspaceRoots()` — resets roots and clears cache |

The cache is **not** invalidated on every keystroke. Content changes (`onDidChangeContent`) trigger diagnostics re-validation but not a full workspace re-scan. This keeps the scanner performant — file system scans only run after explicit save events.

> **Note:** Store properties, template vars, and inline `<script>` directives are scanned from **open documents** (via `TextDocuments`), so they always reflect the latest saved state of opened files.

---

## Workspace Root Detection

The server resolves workspace roots during the `onInitialize` handshake:

1. If the client reports `workspaceFolders`, each folder URI is converted to a file system path.
2. If no workspace folders are available, `rootUri` is used as a single-root fallback.
3. When workspace folders change at runtime, the server re-resolves roots and invalidates the cache.

Multi-root workspaces are fully supported — all scanners iterate over every root.

---

## Integration with Providers

The `getWorkspaceData(documents)` function is the single entry point used by all providers:

| Provider | Data Used | Purpose |
|----------|----------|---------|
| [Completions](../features/completions.md) | `i18nKeys` | Suggest `t="..."` translation keys |
| [Completions](../features/completions.md) | `routes` | Suggest route paths |
| [Completions](../features/completions.md) | `storeProperties` | Suggest `$store.name.*` properties |
| [Completions](../features/completions.md) | `customDirectives` | Include custom directives in attribute completions |
| [Completions](../features/completions.md) | `templateVars` | Suggest `var-*` attributes for `use` elements |
| [Hover](../features/hover.md) | `i18nKeys` | Show translation values on hover |
| [Diagnostics](../features/diagnostics.md) | `customDirectives` | Suppress false "unknown directive" warnings |
| [Go to Definition](../features/go-to-definition.md) | `i18nKeys`, `routes` | Navigate to locale files and page files |

---

## Data Types

```ts
interface I18nKeyInfo {
  key: string;       // Dot-notation key, e.g., "common.nav.home"
  value: string;     // Resolved value, e.g., "Home"
  locale: string;    // Locale code, e.g., "en"
  filePath: string;  // Absolute path to the source JSON file
}

interface RouteInfo {
  path: string;      // Route path, e.g., "/about"
  filePath: string;  // Absolute path to the page file
  fileName: string;  // File name, e.g., "about.html"
}

interface StorePropertyInfo {
  storeName: string;   // Store name, e.g., "user"
  properties: string[]; // Top-level property names, e.g., ["name", "role"]
}

interface CustomDirectiveInfo {
  name: string;      // Directive name, e.g., "tooltip"
  filePath: string;  // File where the directive is registered
}

interface TemplateVarInfo {
  templateId: string;  // Template element's id attribute
  varNames: string[];  // Detected var-* parameter names
}
```
