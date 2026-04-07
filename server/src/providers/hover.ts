import {
  Hover,
  HoverParams,
  MarkupKind,
  TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getElementAtOffset, ElementInfo } from '../html-parser';
import {
  matchDirective,
  getFilter,
  getValidator,
  getDirective,
  getPatterns,
  DirectiveMeta,
  PatternMeta,
  isHttpDirective,
  getAnimations,
  getLifecycleEvents,
  getLoopContextVars,
  getEventModifiers,
} from '../directive-registry';
import type { DevToolsBridge } from '../devtools-bridge';

export function onHover(documents: TextDocuments<TextDocument>, getBridge?: () => DevToolsBridge | null) {
  return async (params: HoverParams): Promise<Hover | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const htmlDoc = parseHtmlDocument(document);
    const element = getElementAtOffset(htmlDoc, offset, text);

    if (!element) return null;

    // Find which attribute the cursor is on
    const attr = element.attributes.find(
      a => a.nameStart <= offset && offset <= a.nameEnd
    );

    if (attr) {
      return getAttributeHover(attr.name, element);
    }

    // Check if cursor is on an attribute value
    const valueAttr = element.attributes.find(
      a => a.valueStart !== -1 && a.valueStart <= offset && offset <= a.valueEnd
    );

    if (valueAttr) {
      // Wildcard route hover: route="*" on <template>
      if (valueAttr.name === 'route' && valueAttr.value === '*' && element.tag === 'template') {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: '### `route="*"` — Catch-all wildcard route\n\n'
              + 'Matches when **no other route** matches the current path. '
              + 'Used to create custom 404 pages.\n\n'
              + '**Fallback chain** (per outlet):\n'
              + '1. Local wildcard \u2014 `<template route="*" outlet="name">`\n'
              + '2. Global wildcard \u2014 `<template route="*">` (default outlet)\n'
              + '3. Built-in generic 404\n\n'
              + '**`$route.matched`**: `false` when the wildcard renders, '
              + '`true` for explicit route matches.\n\n'
              + '```html\n<template route="*">\n  <h1>404</h1>\n  <p>Path <code bind="$route.path"></code> not found.</p>\n</template>\n```',
          },
        };
      }
      return getValueHover(valueAttr.name, valueAttr.value ?? '', offset - valueAttr.valueStart, element, getBridge);
    }

    return null;
  };
}

function getAttributeHover(attrName: string, element: ElementInfo): Hover | null {
  const matched = matchDirective(attrName);

  if (matched) {
    if ('pattern' in matched && matched.pattern) {
      // This is an exact directive
      const dir = matched as DirectiveMeta;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: buildDirectiveHover(dir),
        },
      };
    } else if ('prefix' in matched) {
      // Pattern match
      const pat = matched as PatternMeta;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: buildPatternHover(pat, attrName),
        },
      };
    } else {
      // Exact directive (pattern=false)
      const dir = matched as DirectiveMeta;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: buildDirectiveHover(dir),
        },
      };
    }
  }

  // Check if it's a well-known companion attribute
  const companionInfo = getCompanionDescription(attrName, element);
  if (companionInfo) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: companionInfo,
      },
    };
  }

  return null;
}

/** Context key descriptions for hover */
const CONTEXT_KEY_DOCS: Record<string, string> = {
  '$refs': 'No.JS: **`$refs`** — Access to DOM elements marked with `ref` attribute.\n\nUsage: `$refs.myInput.focus()`',
  '$store': 'No.JS: **`$store`** — Access to the global reactive store.\n\nUsage: `$store.user.name`',
  '$route': 'No.JS: **`$route`** — Current route information (path, params, query, hash, matched).\n\nUsage: `$route.params.id`, `$route.matched`',
  '$router': 'No.JS: **`$router`** — Router instance for programmatic navigation.\n\nUsage: `$router.push(\'/about\')`',
  '$i18n': 'No.JS: **`$i18n`** — Internationalization helper for translations.\n\nUsage: `$i18n.t(\'greeting\')`',
  '$form': 'No.JS: **`$form`** — Form validation state and methods.\n\nProperties: `valid`, `dirty`, `touched`, `pending`, `submitting`, `errors`, `values`, `fields`, `firstError`, `errorCount`, `reset()`\n\nUsage: `$form.valid`, `$form.errors.email`, `$form.fields.email.touched`',
  '$el': 'No.JS: **`$el`** — Reference to the current DOM element.',
  '$event': 'No.JS: **`$event`** — The native DOM event object in event handlers.',
  '$parent': 'No.JS: **`$parent`** — Reference to the parent component context.',
  '$old': 'No.JS: **`$old`** — Previous value in `watch` `on:change` handler.',
  '$new': 'No.JS: **`$new`** — New value in `watch` `on:change` handler.',
  '$error': 'No.JS: **`$error`** — Error object in error handlers and `error` templates.\n\nProperties: `$error.message`, `$error.status`',
  '$watch': 'No.JS: **`$watch`** — Programmatically watch an expression for changes.\n\nUsage: `$watch("expr", callback)`',
  '$notify': 'No.JS: **`$notify`** — Manually trigger re-evaluation of watchers and bindings.',
  '$set': 'No.JS: **`$set`** — Imperatively set a reactive state property.\n\nUsage: `$set("key", value)`',
  '$drag': 'No.JS _(nojs-elements plugin)_: **`$drag`** — The dragged item value in `drop` handlers (array if multi-select).',
  '$dragType': 'No.JS _(nojs-elements plugin)_: **`$dragType`** — The `drag-type` of the dragged item.',
  '$dragEffect': 'No.JS _(nojs-elements plugin)_: **`$dragEffect`** — The `drag-effect` of the drag operation.',
  '$dropIndex': 'No.JS _(nojs-elements plugin)_: **`$dropIndex`** — Insertion index in the drop zone.',
  '$source': 'No.JS _(nojs-elements plugin)_: **`$source`** — Source info object `{ list, index, el }` in drop handlers.',
  '$target': 'No.JS _(nojs-elements plugin)_: **`$target`** — Target info object `{ list, index, el }` in drop handlers.',
  '$rule': 'No.JS: **`$rule`** — The validation rule name that triggered the error (e.g. `required`, `email`). Available in error templates.',
};

/** Loop variable descriptions for hover */
const LOOP_VAR_DOCS: Record<string, string> = {
  '$index': 'No.JS: **`$index`** — Zero-based index of the current item in the loop.',
  '$count': 'No.JS: **`$count`** — Total number of items in the loop.',
  '$first': 'No.JS: **`$first`** — `true` if this is the first item in the loop.',
  '$last': 'No.JS: **`$last`** — `true` if this is the last item in the loop.',
  '$even': 'No.JS: **`$even`** — `true` if the current index is even.',
  '$odd': 'No.JS: **`$odd`** — `true` if the current index is odd.',
};

function buildDirectiveHover(dir: DirectiveMeta): string {
  const lines: string[] = [];
  lines.push(`### \`${dir.name}\` directive`);
  lines.push('');
  lines.push(dir.documentation);
  lines.push('');
  lines.push(`**Category:** ${dir.category}`);
  lines.push(`**Value:** ${dir.valueDescription} ${dir.requiresValue ? '(required)' : '(optional)'}`);

  if (dir.companions.length > 0) {
    lines.push('');
    lines.push('**Companion attributes:**');
    for (const c of dir.companions) {
      lines.push(`- \`${c.name}\` — ${c.description}`);
    }
  }

  return lines.join('\n');
}

function buildPatternHover(pat: PatternMeta, attrName: string): string {
  const lines: string[] = [];
  const suffix = attrName.substring(pat.prefix.length);
  lines.push(`### \`${pat.name}\` directive`);
  lines.push('');
  lines.push(pat.documentation);
  lines.push('');

  if (suffix) {
    if (pat.name === 'on:*') {
      lines.push(`**Event:** \`${suffix}\``);
      // Check for modifiers
      const parts = suffix.split('.');
      if (parts.length > 1) {
        lines.push(`**Modifiers:** ${parts.slice(1).map(m => `\`${m}\``).join(', ')}`);
      }
    } else if (pat.name === 'bind-*') {
      lines.push(`**Target attribute:** \`${suffix}\``);
    } else if (pat.name === 'class-*') {
      lines.push(`**CSS class:** \`${suffix}\``);
    } else if (pat.name === 'style-*') {
      lines.push(`**CSS property:** \`${suffix}\``);
    }
  }

  return lines.join('\n');
}

function getCompanionDescription(attrName: string, element: ElementInfo): string | null {
  // Known companion attributes across directives
  const elementDirectives = element.attributes.map(a => a.name);

  for (const dirName of elementDirectives) {
    const dir = getDirective(dirName);
    if (dir) {
      const comp = dir.companions.find(c => c.name === attrName);
      if (comp) {
        return `No.JS: **\`${attrName}\`** — Companion attribute for \`${dirName}\`\n\n${comp.description}`;
      }
    }
  }

  return null;
}

function getValueHover(attrName: string, value: string, offsetInValue: number, element: ElementInfo, getBridge?: () => DevToolsBridge | null): Hover | null {
  // Check for filter in pipe-separated expressions
  if (value.includes('|')) {
    const parts = value.split('|');
    let currentOffset = 0;
    for (let i = 0; i < parts.length; i++) {
      const partLen = parts[i].length;
      if (i > 0 && offsetInValue >= currentOffset && offsetInValue <= currentOffset + partLen) {
        // Cursor is on this filter segment
        const filterPart = parts[i].trim();
        const filterName = filterPart.split(':')[0].trim();
        const filter = getFilter(filterName);
        if (filter) {
          return {
            contents: {
              kind: MarkupKind.Markdown,
              value: buildFilterHover(filter),
            },
          };
        }
      }
      currentOffset += partLen + 1; // +1 for the pipe
    }
  }

  // Context key hover in expressions
  const dollarMatches = value.matchAll(/\$\w+/g);
  for (const match of dollarMatches) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;
    if (offsetInValue >= matchStart && offsetInValue <= matchEnd) {
      const key = match[0];
      // Check context keys
      if (CONTEXT_KEY_DOCS[key]) {
        let hoverText = CONTEXT_KEY_DOCS[key];

        // Live value augmentation for $store references
        if (key === '$store' && getBridge) {
          const liveInfo = _getLiveStoreHover(value, offsetInValue, getBridge);
          if (liveInfo) hoverText += '\n\n---\n\n' + liveInfo;
        }

        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: hoverText,
          },
        };
      }
      // Check loop variables
      if (LOOP_VAR_DOCS[key]) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: LOOP_VAR_DOCS[key],
          },
        };
      }
    }
  }

  // Animation values
  if (attrName === 'animate' || attrName === 'animate-enter' || attrName === 'animate-leave') {
    const animations = getAnimations();
    if (animations.includes(value)) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**\`${value}\`** — NoJS built-in animation`,
        },
      };
    }
  }

  return null;
}

function buildFilterHover(filter: { name: string; description: string; args: { name: string; type: string; required?: boolean; default?: unknown }[]; example: string; category: string }): string {
  const lines: string[] = [];
  lines.push(`### \`${filter.name}\` filter`);
  lines.push('');
  lines.push(filter.description);

  if (filter.args.length > 0) {
    lines.push('');
    lines.push('**Arguments:**');
    for (const arg of filter.args) {
      const req = arg.required ? '(required)' : `(optional, default: ${arg.default ?? 'none'})`;
      lines.push(`- \`${arg.name}\`: ${arg.type} ${req}`);
    }
  }

  lines.push('');
  lines.push(`**Example:** \`${filter.example}\``);
  lines.push(`**Category:** ${filter.category}`);

  return lines.join('\n');
}

// ─── Live value helpers ──────────────────────────────────────────────────

function _getLiveStoreHover(
  fullValue: string,
  _offsetInValue: number,
  getBridge: () => DevToolsBridge | null,
): string | null {
  const bridge = getBridge();
  if (!bridge || !bridge.connected) return null;

  // Extract $store.name.property pattern from the expression
  const storeMatch = fullValue.match(/\$store\.(\w+)(?:\.(\w[\w.]*))?/);
  if (!storeMatch) return null;

  const storeName = storeMatch[1];
  const propertyPath = storeMatch[2];

  return `\u26a1 **Live** \u2014 store \`${storeName}\`${propertyPath ? `.${propertyPath}` : ''} (DevTools connected)`;
}
