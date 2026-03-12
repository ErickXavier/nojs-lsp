import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  parseHtmlDocument,
  getAllElements,
  getPreviousSibling,
  findTemplates,
  ElementInfo,
} from '../html-parser';
import {
  matchDirective,
  isDirective,
  isCompanion,
  isHttpDirective,
  getAllDirectiveNames,
  getAllCompanionNames,
  getFilter,
  getAllFilters,
  getValidator,
  getAllValidators,
  getPatterns,
  getAnimations,
} from '../directive-registry';
import { validateExpressionSyntax } from '../expression-analyzer';

const SOURCE = 'nojs';

export async function validateTextDocument(
  document: TextDocument,
  connection: Connection,
  options?: { validationEnabled?: boolean }
): Promise<void> {
  // Skip validation if disabled via settings
  if (options?.validationEnabled === false) {
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  const text = document.getText();
  const htmlDoc = parseHtmlDocument(document);
  const elements = getAllElements(htmlDoc, text);
  const diagnostics: Diagnostic[] = [];

  const allDirectiveNames = getAllDirectiveNames();
  const allCompanionNames = getAllCompanionNames();
  const allPatternPrefixes = getPatterns().map(p => p.prefix);

  // Track state declarations for duplicate detection
  const stateDeclarations = new Map<string, { element: ElementInfo; attr: { nameStart: number; nameEnd: number } }[]>();
  // Track ref declarations for duplicate detection
  const refDeclarations = new Map<string, { element: ElementInfo; attr: { nameStart: number; nameEnd: number } }[]>();
  // Track referenced template IDs for existence check
  const referencedTemplateIds: { id: string; nameStart: number; nameEnd: number }[] = [];

  for (const el of elements) {
    const directivesOnElement = el.attributes.filter(a => isDirective(a.name)).map(a => a.name);

    for (const attr of el.attributes) {
      const { name, value, nameStart, nameEnd, valueStart, valueEnd } = attr;

      // 1. Unknown directive warning
      if (couldBeNoJsAttribute(name, allDirectiveNames, allCompanionNames, allPatternPrefixes)) {
        if (!isDirective(name) && !isCompanion(name, directivesOnElement) && !isStandardHtmlAttribute(name)) {
          // Only warn if it looks like it might be a NoJS attribute
          if (looksLikeNoJsDirective(name, allDirectiveNames)) {
            const range = toRange(document, nameStart, nameEnd);
            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range,
              message: `No.JS: Unknown directive "${name}". Did you mean one of the known directives?`,
              source: SOURCE,
            });
          }
        }
      }

      // 2. Missing required value
      const matched = matchDirective(name);
      if (matched && 'requiresValue' in matched && matched.requiresValue) {
        if (value === null || value === undefined || value.trim() === '') {
          const range = toRange(document, nameStart, nameEnd);
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range,
            message: `No.JS: Directive "${name}" requires a value.`,
            source: SOURCE,
          });
        }
      }

      // 3. Orphaned else / else-if
      if (name === 'else' || name === 'else-if') {
        const prevSibling = getPreviousSibling(el.node);
        if (prevSibling) {
          const prevAttrs = prevSibling.attributes ? Object.keys(prevSibling.attributes) : [];
          const hasIf = prevAttrs.includes('if');
          const hasElseIf = prevAttrs.includes('else-if');
          if (!hasIf && !hasElseIf) {
            const range = toRange(document, nameStart, nameEnd);
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range,
              message: `No.JS: "${name}" must be preceded by a sibling with "if" or "else-if".`,
              source: SOURCE,
            });
          }
        } else {
          const range = toRange(document, nameStart, nameEnd);
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range,
            message: `No.JS: "${name}" must be preceded by a sibling with "if" or "else-if".`,
            source: SOURCE,
          });
        }
      }

      // 4. Unknown filter in expression
      if (value && value.includes('|') && isDirective(name)) {
        const pipes = value.split('|').slice(1);
        for (const pipe of pipes) {
          const filterName = pipe.trim().split(':')[0].trim();
          if (filterName && !getFilter(filterName)) {
            // Only warn if it looks like a filter name (letters/numbers/hyphens)
            if (/^[a-zA-Z][\w-]*$/.test(filterName)) {
              const filterOffset = value.indexOf(filterName, value.indexOf('|'));
              const start = valueStart + filterOffset;
              const range = toRange(document, start, start + filterName.length);
              diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range,
                message: `No.JS: Unknown filter "${filterName}". Available filters: ${getAllFilters().map(f => f.name).join(', ')}.`,
                source: SOURCE,
              });
            }
          }
        }
      }

      // 5. Track state declarations for duplicate detection
      if (name === 'state') {
        if (value) {
          // state attribute can define multiple states
          const stateNames = parseStateNames(value);
          for (const sn of stateNames) {
            if (!stateDeclarations.has(sn)) {
              stateDeclarations.set(sn, []);
            }
            stateDeclarations.get(sn)!.push({ element: el, attr: { nameStart, nameEnd } });
          }
        }
      }

      // 6. Invalid animation name
      if ((name === 'animate' || name === 'animate-enter' || name === 'animate-leave') && value) {
        const validAnimations = getAnimations();
        const animValue = value.trim();
        if (animValue && !validAnimations.includes(animValue) && !animValue.startsWith('custom-')) {
          const range = toRange(document, valueStart, valueEnd);
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range,
            message: `No.JS: Unknown animation "${animValue}". Available: ${validAnimations.join(', ')}.`,
            source: SOURCE,
          });
        }
      }

      // 7. Invalid event modifier
      if (name.startsWith('on:') && name.includes('.')) {
        const parts = name.split('.');
        const knownModifiers = getKnownModifiers();
        for (let i = 1; i < parts.length; i++) {
          if (!knownModifiers.has(parts[i])) {
            const range = toRange(document, nameStart, nameEnd);
            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range,
              message: `No.JS: Unknown event modifier "${parts[i]}".`,
              source: SOURCE,
            });
            break;
          }
        }
      }

      // 8. Unknown validator name in validate attribute
      if (name === 'validate' && value) {
        const rules = value.split('|').map(r => r.trim().split(':')[0].trim());
        for (const rule of rules) {
          if (rule && !getValidator(rule)) {
            const ruleOffset = value.indexOf(rule);
            const start = valueStart + ruleOffset;
            const range = toRange(document, start, start + rule.length);
            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range,
              message: `No.JS: Unknown validator "${rule}". Available: ${getAllValidators().map(v => v.name).join(', ')}.`,
              source: SOURCE,
            });
          }
        }
      }

      // 9. model on non-form element
      if (name === 'model') {
        const formTags = new Set(['input', 'textarea', 'select', 'option']);
        if (!formTags.has(el.tag)) {
          const range = toRange(document, nameStart, nameEnd);
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range,
            message: `No.JS: "model" is typically used on form elements (input, textarea, select). Found on <${el.tag}>.`,
            source: SOURCE,
          });
        }
      }

      // 10. Duplicate ref names
      if (name === 'ref' && value) {
        const refName = value.trim();
        if (!refDeclarations.has(refName)) {
          refDeclarations.set(refName, []);
        }
        refDeclarations.get(refName)!.push({ element: el, attr: { nameStart, nameEnd } });
      }

      // 11. Template ID referenced but not defined
      if ((name === 'use' || name === 'then' || name === 'else' || name === 'loading' ||
           name === 'error' || name === 'empty' || name === 'success' || name === 'template' ||
           name === 'error-boundary') && value) {
        // Only check if it looks like a template ID (simple identifier, not an expression)
        const templateId = value.trim();
        if (templateId && /^[\w-]+$/.test(templateId)) {
          referencedTemplateIds.push({ id: templateId, nameStart: valueStart, nameEnd: valueEnd });
        }
      }

      // 12. Missing companion `as` for HTTP directives
      if (isHttpDirective(name) && value) {
        const hasAs = el.attributes.some(a => a.name === 'as');
        if (!hasAs) {
          const range = toRange(document, nameStart, nameEnd);
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range,
            message: `No.JS: HTTP directive "${name}" is missing the "as" companion attribute to bind the response data.`,
            source: SOURCE,
          });
        }
      }

      // 13. Expression syntax validation
      if (value && isDirective(name)) {
        const matched = matchDirective(name);
        if (matched && 'requiresValue' in matched && matched.requiresValue) {
          // Skip certain directives where values are not standard JS expressions
          const skipSyntaxCheck = new Set([
            'validate', 'ref', 'store', 't', 'i18n-ns', 'trigger',
            'error-boundary', 'use', 'drag-handle',
          ]);
          if (!skipSyntaxCheck.has(name) && !name.startsWith('on:') && !isHttpDirective(name)) {
            const syntaxError = validateExpressionSyntax(value);
            if (syntaxError) {
              const range = toRange(document, valueStart, valueEnd);
              diagnostics.push({
                severity: DiagnosticSeverity.Hint,
                range,
                message: `No.JS: Possible syntax error in expression: ${syntaxError}`,
                source: SOURCE,
              });
            }
          }
        }
      }
    }
  }

  // Post-loop: Report duplicate state declarations
  for (const [stateName, decls] of stateDeclarations) {
    if (decls.length > 1) {
      for (const decl of decls) {
        const range = toRange(document, decl.attr.nameStart, decl.attr.nameEnd);
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range,
          message: `No.JS: Duplicate state declaration "${stateName}" is declared ${decls.length} times.`,
          source: SOURCE,
        });
      }
    }
  }

  // Post-loop: Report duplicate ref names
  for (const [refName, decls] of refDeclarations) {
    if (decls.length > 1) {
      for (const decl of decls) {
        const range = toRange(document, decl.attr.nameStart, decl.attr.nameEnd);
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range,
          message: `No.JS: Duplicate ref "${refName}" is declared ${decls.length} times.`,
          source: SOURCE,
        });
      }
    }
  }

  // Post-loop: Report template IDs referenced but not defined
  const templates = findTemplates(htmlDoc, text);
  for (const ref of referencedTemplateIds) {
    if (!templates.has(ref.id)) {
      const range = toRange(document, ref.nameStart, ref.nameEnd);
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range,
        message: `No.JS: Template "${ref.id}" is referenced but not defined in this document.`,
        source: SOURCE,
      });
    }
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

function toRange(document: TextDocument, start: number, end: number): Range {
  return {
    start: document.positionAt(start),
    end: document.positionAt(end),
  };
}

function parseStateNames(value: string): string[] {
  // state="{ count: 0, name: 'test' }" → extract keys
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    const names: string[] = [];
    const keyRegex = /(\w+)\s*:/g;
    let match;
    while ((match = keyRegex.exec(trimmed)) !== null) {
      names.push(match[1]);
    }
    return names;
  }
  // Simple value like state="count"
  return [trimmed];
}

function couldBeNoJsAttribute(
  name: string,
  directives: Set<string>,
  companions: Set<string>,
  patternPrefixes: string[]
): boolean {
  if (directives.has(name)) return true;
  if (companions.has(name)) return true;
  for (const prefix of patternPrefixes) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
}

function looksLikeNoJsDirective(name: string, knownDirectives: Set<string>): boolean {
  // Check if the attribute name is close to a known directive (simple heuristic)
  const lower = name.toLowerCase();
  for (const dir of knownDirectives) {
    if (levenshteinDistance(lower, dir) <= 2) {
      return true;
    }
  }
  return false;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

let _knownModifiers: Set<string> | undefined;

function getKnownModifiers(): Set<string> {
  if (_knownModifiers) return _knownModifiers;
  const patterns = getPatterns();
  const onPattern = patterns.find(p => p.name === 'on:*');
  const modifiers = new Set<string>();
  if (onPattern?.modifiers) {
    for (const m of onPattern.modifiers.behavioral) modifiers.add(m);
    for (const m of onPattern.modifiers.timing) modifiers.add(m);
    for (const m of onPattern.modifiers.key) modifiers.add(m);
  }
  _knownModifiers = modifiers;
  return modifiers;
}

function isStandardHtmlAttribute(name: string): boolean {
  return STANDARD_HTML_ATTRIBUTES.has(name.toLowerCase());
}

const STANDARD_HTML_ATTRIBUTES = new Set([
  'id', 'class', 'style', 'title', 'lang', 'dir', 'tabindex', 'accesskey',
  'hidden', 'draggable', 'contenteditable', 'spellcheck', 'translate',
  'role', 'slot', 'is',
  // Data/aria
  'data-', 'aria-',
  // Global event
  'onclick', 'onchange', 'onsubmit', 'onload', 'onerror', 'onkeydown',
  'onkeyup', 'onkeypress', 'onmousedown', 'onmouseup', 'onmouseover',
  'onfocus', 'onblur', 'oninput',
  // Form
  'action', 'method', 'enctype', 'name', 'value', 'type', 'placeholder',
  'required', 'disabled', 'readonly', 'checked', 'selected', 'multiple',
  'maxlength', 'minlength', 'min', 'max', 'step', 'pattern', 'autocomplete',
  'autofocus', 'form', 'formaction', 'formmethod', 'novalidate',
  // Link/media
  'href', 'src', 'alt', 'width', 'height', 'target', 'rel', 'media',
  'crossorigin', 'integrity', 'loading', 'decoding', 'srcset', 'sizes',
  'download', 'ping', 'referrerpolicy',
  // Table
  'colspan', 'rowspan', 'scope', 'headers',
  // Meta
  'charset', 'content', 'http-equiv', 'property',
  // Misc
  'for', 'defer', 'async', 'cite', 'datetime', 'open', 'wrap',
  'sandbox', 'allow', 'allowfullscreen', 'frameborder',
]);
