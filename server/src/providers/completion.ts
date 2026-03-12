import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  InsertTextFormat,
  MarkupKind,
  TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getCursorContext, CursorContext } from '../html-parser';
import {
  getAllDirectives,
  getPatterns,
  getCompanionsForDirectives,
  getAllFilters,
  getAllValidators,
  getAnimations,
  getLifecycleEvents,
  getContextKeys,
  getLoopContextVars,
  getEventHandlerVars,
  getEventModifiers,
  isHttpDirective,
  matchDirective,
  DirectiveMeta,
  PatternMeta,
  FilterMeta,
  ValidatorMeta,
} from '../directive-registry';
import { getWorkspaceData, WorkspaceData, scanTemplateVars } from '../workspace-scanner';

// We store extended doc in the `data` field for resolving later
interface CompletionData {
  type: 'directive' | 'companion' | 'filter' | 'validator' | 'animation' | 'pattern' | 'lifecycle' | 'contextKey';
  name: string;
}

export interface CompletionSettings {
  filtersEnabled: boolean;
  customFilters: string[];
  customValidators: string[];
}

export function onCompletion(documents: TextDocuments<TextDocument>, getSettings?: (uri: string) => Promise<CompletionSettings>) {
  return async (params: CompletionParams): Promise<CompletionItem[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const settings = getSettings ? await getSettings(document.uri) : { filtersEnabled: true, customFilters: [], customValidators: [] };
    const wsData = getWorkspaceData(documents);

    const htmlDoc = parseHtmlDocument(document);
    const context = getCursorContext(document, params.position, htmlDoc);

    switch (context.type) {
      case 'attributeName':
        return getAttributeNameCompletions(context, wsData, document.getText());
      case 'attributeValue':
        return getAttributeValueCompletions(context, settings, wsData);
      default:
        return [];
    }
  };
}

function getAttributeNameCompletions(context: CursorContext & { type: 'attributeName' }, wsData: WorkspaceData, docText: string): CompletionItem[] {
  const items: CompletionItem[] = [];
  const partial = context.partial.toLowerCase();
  const existingAttrs = new Set(context.element.attributes.map(a => a.name));
  const existingDirectiveNames = context.element.attributes.map(a => a.name);

  // 1. All exact directives
  for (const dir of getAllDirectives()) {
    if (existingAttrs.has(dir.name)) continue;
    if (partial && !dir.name.toLowerCase().startsWith(partial)) continue;

    items.push({
      label: dir.name,
      kind: CompletionItemKind.Property,
      detail: `No.JS: Directive (${dir.category})`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: dir.documentation,
      },
      insertText: dir.requiresValue ? `${dir.name}="$1"` : dir.name,
      insertTextFormat: dir.requiresValue ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
      sortText: `0-${dir.name}`,
      data: { type: 'directive', name: dir.name } as CompletionData,
    });
  }

  // 2. Pattern-based directives (bind-*, class-*, style-*, on:*)
  for (const pat of getPatterns()) {
    if (partial && !pat.prefix.toLowerCase().startsWith(partial) && !partial.startsWith(pat.prefix.toLowerCase())) continue;

    if (pat.name === 'on:*') {
      // Suggest common events
      const events = pat.commonEvents ?? [];
      for (const evt of events) {
        const fullName = `on:${evt}`;
        if (existingAttrs.has(fullName)) continue;
        if (partial && !fullName.toLowerCase().startsWith(partial)) continue;
        items.push({
          label: fullName,
          kind: CompletionItemKind.Event,
          detail: `No.JS: Event handler`,
          documentation: {
            kind: MarkupKind.Markdown,
            value: pat.documentation,
          },
          insertText: `${fullName}="$1"`,
          insertTextFormat: InsertTextFormat.Snippet,
          sortText: `1-${fullName}`,
          data: { type: 'pattern', name: fullName } as CompletionData,
        });
      }
      // Also suggest lifecycle events under on:
      for (const lc of getLifecycleEvents()) {
        const fullName = `on:${lc}`;
        if (existingAttrs.has(fullName)) continue;
        if (partial && !fullName.toLowerCase().startsWith(partial)) continue;
        items.push({
          label: fullName,
          kind: CompletionItemKind.Event,
          detail: `No.JS: Lifecycle event`,
          sortText: `1-${fullName}`,
          data: { type: 'lifecycle', name: fullName } as CompletionData,
        });
      }
    } else if (pat.name === 'bind-*') {
      const targets = pat.commonTargets ?? [];
      for (const target of targets) {
        const fullName = `bind-${target}`;
        if (existingAttrs.has(fullName)) continue;
        if (partial && !fullName.toLowerCase().startsWith(partial)) continue;
        items.push({
          label: fullName,
          kind: CompletionItemKind.Property,
          detail: `No.JS: Attribute binding`,
          documentation: {
            kind: MarkupKind.Markdown,
            value: pat.documentation,
          },
          insertText: `${fullName}="$1"`,
          insertTextFormat: InsertTextFormat.Snippet,
          sortText: `1-${fullName}`,
          data: { type: 'pattern', name: fullName } as CompletionData,
        });
      }
    } else if (pat.name === 'class-*' || pat.name === 'style-*') {
      // Suggest the base pattern as a snippet
      if (partial && !pat.prefix.toLowerCase().startsWith(partial)) continue;
      items.push({
        label: pat.prefix + '…',
        kind: CompletionItemKind.Property,
        detail: `No.JS: ${pat.name} directive`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: pat.documentation,
        },
        insertText: `${pat.prefix}$1="$2"`,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `1-${pat.prefix}`,
        data: { type: 'pattern', name: pat.name } as CompletionData,
      });
    }
  }

  // 3. Event modifier completions after `.` on on:* attributes
  if (partial.startsWith('on:') && partial.includes('.')) {
    const modifiers = getEventModifiers();
    const parts = partial.split('.');
    const baseName = parts[0]; // e.g. "on:click"
    const existingMods = new Set(parts.slice(1, -1)); // already typed modifiers
    const currentMod = parts[parts.length - 1].toLowerCase(); // partial being typed

    const allMods = [
      ...modifiers.behavioral.map(m => ({ name: m, category: 'behavioral' })),
      ...modifiers.timing.map(m => ({ name: m, category: 'timing' })),
      ...modifiers.key.map(m => ({ name: m, category: 'key' })),
    ];

    for (const mod of allMods) {
      if (existingMods.has(mod.name)) continue;
      if (currentMod && !mod.name.toLowerCase().startsWith(currentMod)) continue;
      const fullName = `${parts.slice(0, -1).join('.')}.${mod.name}`;
      items.push({
        label: fullName,
        kind: CompletionItemKind.EnumMember,
        detail: `No.JS: Event modifier (${mod.category})`,
        insertText: `${fullName}="$1"`,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `1-mod-${mod.name}`,
        data: { type: 'pattern', name: fullName } as CompletionData,
      });
    }
  }

  // 4. Companion attributes for directives on this element
  const companions = getCompanionsForDirectives(existingDirectiveNames);
  for (const comp of companions) {
    if (existingAttrs.has(comp.name)) continue;
    if (partial && !comp.name.toLowerCase().startsWith(partial)) continue;

    const isWildcard = comp.name.endsWith('*');
    const label = isWildcard ? comp.name.slice(0, -1) + '…' : comp.name;
    const insertText = isWildcard
      ? `${comp.name.slice(0, -1)}$1="$2"`
      : `${comp.name}="$1"`;

    items.push({
      label,
      kind: CompletionItemKind.Field,
      detail: `No.JS: Companion attribute (${comp.type})`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: comp.description,
      },
      insertText,
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: `2-${comp.name}`,
      data: { type: 'companion', name: comp.name } as CompletionData,
    });
  }

  // 5. Custom directives from workspace JS files
  for (const dir of wsData.customDirectives) {
    if (existingAttrs.has(dir.name)) continue;
    if (partial && !dir.name.toLowerCase().startsWith(partial)) continue;
    items.push({
      label: dir.name,
      kind: CompletionItemKind.Property,
      detail: 'No.JS: Custom directive',
      documentation: {
        kind: MarkupKind.Markdown,
        value: `Custom directive registered via \`NoJS.directive('${dir.name}', ...)\`\n\nDefined in: \`${dir.filePath}\``,
      },
      insertText: `${dir.name}="$1"`,
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: `3-${dir.name}`,
    });
  }

  // 6. Template var-* attribute suggestions when use="templateId" is present
  const useAttr = context.element.attributes.find(a => a.name === 'use');
  if (useAttr && useAttr.value) {
    const templateVars = scanTemplateVars(docText);
    const templateInfo = templateVars.find(t => t.templateId === useAttr.value);
    if (templateInfo) {
      for (const varName of templateInfo.varNames) {
        const attrName = `var-${varName}`;
        if (existingAttrs.has(attrName)) continue;
        if (partial && !attrName.toLowerCase().startsWith(partial)) continue;
        items.push({
          label: attrName,
          kind: CompletionItemKind.Variable,
          detail: `No.JS: Template variable for "${useAttr.value}"`,
          insertText: `${attrName}="$1"`,
          insertTextFormat: InsertTextFormat.Snippet,
          sortText: `2-${attrName}`,
        });
      }
    }
  }

  return items;
}

function getAttributeValueCompletions(context: CursorContext & { type: 'attributeValue' }, settings: CompletionSettings, wsData: WorkspaceData): CompletionItem[] {
  const items: CompletionItem[] = [];
  const { attrName, partial } = context;

  // Determine what kind of value completions to provide
  const directive = matchDirective(attrName);

  // Filter completions: if the value contains a pipe character "|"
  if (settings.filtersEnabled && partial.includes('|')) {
    // Get the text after the last pipe
    const afterPipe = partial.substring(partial.lastIndexOf('|') + 1).trim();
    // Check if we're in filter args (after a colon) — provide argument hints
    if (afterPipe.includes(':')) {
      const filterName = afterPipe.split(':')[0].trim();
      const filter = getAllFilters().find(f => f.name === filterName);
      if (filter && filter.args.length > 0) {
        const colonCount = (afterPipe.match(/:/g) || []).length;
        const argIndex = colonCount - 1; // 0-based: first colon = first arg
        if (argIndex < filter.args.length) {
          const arg = filter.args[argIndex];
          items.push({
            label: `${arg.name} (${arg.type})`,
            kind: CompletionItemKind.TypeParameter,
            detail: `No.JS: Argument ${argIndex + 1} of ${filter.name}`,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `**${filter.name}** — argument \`${arg.name}\`\n\nType: \`${arg.type}\`\n${arg.required ? 'Required' : `Optional${(arg as any).default !== undefined ? `, default: \`${(arg as any).default}\`` : ''}`}\n\n**Example:** \`${filter.example}\``,
            },
            sortText: `0-arg-${argIndex}`,
          });
        }
      }
      return items;
    }
    // Suggest filter names
    for (const filter of getAllFilters()) {
      if (afterPipe && !filter.name.toLowerCase().startsWith(afterPipe.toLowerCase())) continue;
      items.push({
        label: filter.name,
        kind: CompletionItemKind.Function,
        detail: `No.JS: ${filter.description.replace(/^No\.JS: /, '')}`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${filter.name}**\n\n${filter.description}\n\n**Example:** \`${filter.example}\``,
        },
        sortText: `0-${filter.name}`,
        data: { type: 'filter', name: filter.name } as CompletionData,
      });
    }
    // Custom user-defined filters
    for (const name of settings.customFilters) {
      if (afterPipe && !name.toLowerCase().startsWith(afterPipe.toLowerCase())) continue;
      items.push({
        label: name,
        kind: CompletionItemKind.Function,
        detail: 'No.JS: Custom filter',
        sortText: `1-${name}`,
      });
    }
    return items;
  }

  // Animation values
  if (attrName === 'animate' || attrName === 'animate-enter' || attrName === 'animate-leave') {
    for (const anim of getAnimations()) {
      if (partial && !anim.toLowerCase().startsWith(partial.toLowerCase())) continue;
      items.push({
        label: anim,
        kind: CompletionItemKind.EnumMember,
        detail: 'No.JS: Animation',
        sortText: `0-${anim}`,
        data: { type: 'animation', name: anim } as CompletionData,
      });
    }
    return items;
  }

  // HTTP method values
  if (attrName === 'method' && context.element.attributes.some(a => isHttpDirective(a.name))) {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    for (const m of methods) {
      items.push({
        label: m,
        kind: CompletionItemKind.EnumMember,
        detail: 'No.JS: HTTP method',
        sortText: `0-${m}`,
      });
    }
    return items;
  }

  // Lazy mode values
  if (attrName === 'lazy') {
    const modes = ['ondemand', 'priority'];
    for (const m of modes) {
      items.push({
        label: m,
        kind: CompletionItemKind.EnumMember,
        detail: 'No.JS: Lazy loading mode',
        sortText: `0-${m}`,
      });
    }
    return items;
  }

  // drag-effect / drop-effect values
  if (attrName === 'drag-effect') {
    const effects = ['copy', 'move', 'link', 'none'];
    for (const e of effects) {
      items.push({ label: e, kind: CompletionItemKind.EnumMember, detail: 'No.JS: Drag effect' });
    }
    return items;
  }
  if (attrName === 'drop-effect') {
    const effects = ['copy', 'move', 'link', 'none'];
    for (const e of effects) {
      items.push({ label: e, kind: CompletionItemKind.EnumMember, detail: 'No.JS: Drop effect' });
    }
    return items;
  }

  // Validate attribute values: offer validators
  if (attrName === 'validate') {
    for (const v of getAllValidators()) {
      if (partial && !v.name.toLowerCase().startsWith(partial.toLowerCase())) continue;
      items.push({
        label: v.name,
        kind: CompletionItemKind.Function,
        detail: `No.JS: ${v.description.replace(/^No\.JS: /, '')}`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${v.name}**\n\n${v.description}\n\n**Example:** \`${v.example}\``,
        },
        sortText: `0-${v.name}`,
        data: { type: 'validator', name: v.name } as CompletionData,
      });
    }
    // Custom user-defined validators
    for (const name of settings.customValidators) {
      if (partial && !name.toLowerCase().startsWith(partial.toLowerCase())) continue;
      items.push({
        label: name,
        kind: CompletionItemKind.Function,
        detail: 'No.JS: Custom validator',
        sortText: `1-${name}`,
      });
    }
    return items;
  }

  // i18n key completions for t="..." and t-html="..."
  if (attrName === 't' || attrName === 't-html') {
    for (const keyInfo of wsData.i18nKeys) {
      if (partial && !keyInfo.key.toLowerCase().startsWith(partial.toLowerCase())) continue;
      // Deduplicate: show each key once (use first locale found)
      if (items.some(i => i.label === keyInfo.key)) continue;
      items.push({
        label: keyInfo.key,
        kind: CompletionItemKind.Text,
        detail: `No.JS: i18n key (${keyInfo.locale})`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${keyInfo.key}**\n\nValue (${keyInfo.locale}): \`${keyInfo.value}\``,
        },
        sortText: `0-${keyInfo.key}`,
      });
    }
    if (items.length > 0) return items;
  }

  // Route path completions for route="..." and redirect="..."
  if (attrName === 'route' || attrName === 'redirect') {
    for (const route of wsData.routes) {
      if (partial && !route.path.toLowerCase().startsWith(partial.toLowerCase())) continue;
      items.push({
        label: route.path,
        kind: CompletionItemKind.File,
        detail: `No.JS: Route → ${route.fileName}`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**${route.path}**\n\nFile: \`${route.filePath}\``,
        },
        sortText: `0-${route.path}`,
      });
    }
    if (items.length > 0) return items;
  }

  // Store property completions in expressions containing $store.
  if (directive && partial.includes('$store.')) {
    const storeRef = partial.substring(partial.lastIndexOf('$store.') + 7);
    const dotIndex = storeRef.indexOf('.');
    if (dotIndex === -1) {
      // Suggest store names
      for (const store of wsData.storeProperties) {
        if (storeRef && !store.storeName.toLowerCase().startsWith(storeRef.toLowerCase())) continue;
        items.push({
          label: `$store.${store.storeName}`,
          kind: CompletionItemKind.Module,
          detail: `No.JS: Store ${store.storeName}`,
          documentation: {
            kind: MarkupKind.Markdown,
            value: `**${store.storeName}**\n\nProperties: ${store.properties.join(', ')}`,
          },
          sortText: `0-${store.storeName}`,
        });
      }
    } else {
      // Suggest store properties
      const storeName = storeRef.substring(0, dotIndex);
      const propPartial = storeRef.substring(dotIndex + 1);
      const store = wsData.storeProperties.find(s => s.storeName === storeName);
      if (store) {
        for (const prop of store.properties) {
          if (propPartial && !prop.toLowerCase().startsWith(propPartial.toLowerCase())) continue;
          items.push({
            label: `$store.${storeName}.${prop}`,
            kind: CompletionItemKind.Property,
            detail: `No.JS: ${storeName}.${prop}`,
            sortText: `0-${prop}`,
          });
        }
      }
    }
  }

  // Context keys in expression values
  if (directive && partial.includes('$')) {
    const afterDollar = partial.substring(partial.lastIndexOf('$'));
    for (const key of getContextKeys()) {
      if (afterDollar && !key.startsWith(afterDollar)) continue;
      items.push({
        label: key,
        kind: CompletionItemKind.Variable,
        detail: 'No.JS: Context variable',
        sortText: `0-${key}`,
        data: { type: 'contextKey', name: key } as CompletionData,
      });
    }
  }

  // Event handler variables ($event, $el, $refs, etc.)
  if (attrName.startsWith('on:') && !partial.includes('|')) {
    for (const v of getEventHandlerVars()) {
      if (partial && !partial.endsWith('$') && !v.startsWith(partial.substring(partial.lastIndexOf('$')))) continue;
      items.push({
        label: v,
        kind: CompletionItemKind.Variable,
        detail: 'No.JS: Event handler variable',
        sortText: `1-${v}`,
      });
    }
  }

  return items;
}

export function onCompletionResolve(item: CompletionItem): CompletionItem {
  // Extended docs could be added here if needed
  return item;
}
