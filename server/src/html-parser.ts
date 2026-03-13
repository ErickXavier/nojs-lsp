import {
  getLanguageService,
  HTMLDocument,
  LanguageService,
  Node as HtmlNode,
  TextDocument as HtmlTextDocument,
} from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { matchDirective, getAllDirectiveNames, getPatterns } from './directive-registry';

let htmlService: LanguageService;

function getHtmlService(): LanguageService {
  if (!htmlService) {
    htmlService = getLanguageService();
  }
  return htmlService;
}

export interface ParsedAttribute {
  name: string;
  value: string | null;
  nameStart: number;
  nameEnd: number;
  valueStart: number;
  valueEnd: number;
}

export interface ElementInfo {
  tag: string;
  attributes: ParsedAttribute[];
  start: number;
  end: number;
  node: HtmlNode;
}

/** Parses the HTML document using vscode-html-languageservice */
export function parseHtmlDocument(document: TextDocument): HTMLDocument {
  const htmlDoc = HtmlTextDocument.create(
    document.uri,
    document.languageId,
    document.version,
    document.getText()
  );
  return getHtmlService().parseHTMLDocument(htmlDoc);
}

/** Extract attributes from an HTML node */
function getNodeAttributes(node: HtmlNode, text: string): ParsedAttribute[] {
  const attrs: ParsedAttribute[] = [];
  if (!node.attributes) return attrs;

  for (const [name, value] of Object.entries(node.attributes)) {
    // Find the attribute position in the text
    const tagContent = text.substring(node.start, node.startTagEnd ?? node.end);
    const nameIdx = findAttributePosition(tagContent, name);
    if (nameIdx === -1) continue;

    const absoluteNameStart = node.start + nameIdx;
    const absoluteNameEnd = absoluteNameStart + name.length;

    let valueStart = -1;
    let valueEnd = -1;
    let attrValue: string | null = null;

    if (value !== null) {
      // Strip surrounding quotes for the value
      attrValue = typeof value === 'string' ? value.replace(/^["']|["']$/g, '') : null;
      const eqIdx = tagContent.indexOf('=', nameIdx + name.length);
      if (eqIdx !== -1) {
        const quoteStart = tagContent.indexOf('"', eqIdx) !== -1
          ? tagContent.indexOf('"', eqIdx) + 1
          : tagContent.indexOf("'", eqIdx) !== -1
          ? tagContent.indexOf("'", eqIdx) + 1
          : eqIdx + 1;
        valueStart = node.start + quoteStart;
        valueEnd = valueStart + (attrValue?.length ?? 0);
      }
    }

    attrs.push({
      name,
      value: attrValue,
      nameStart: absoluteNameStart,
      nameEnd: absoluteNameEnd,
      valueStart,
      valueEnd,
    });
  }
  return attrs;
}

function findAttributePosition(tagContent: string, attrName: string): number {
  // Search for the attribute name as a whole word in the tag
  const regex = new RegExp(`\\b${escapeRegex(attrName)}\\b`);
  const match = regex.exec(tagContent);
  return match ? match.index : -1;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Walk all nodes in the HTML document and collect element info */
export function getAllElements(htmlDoc: HTMLDocument, text: string): ElementInfo[] {
  const elements: ElementInfo[] = [];

  function walk(node: HtmlNode) {
    if (node.tag) {
      elements.push({
        tag: node.tag,
        attributes: getNodeAttributes(node, text),
        start: node.start,
        end: node.end,
        node,
      });
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const root of htmlDoc.roots) {
    walk(root);
  }
  return elements;
}

/** Get the element containing the given offset */
export function getElementAtOffset(htmlDoc: HTMLDocument, offset: number, text: string): ElementInfo | undefined {
  function walk(node: HtmlNode): ElementInfo | undefined {
    if (node.start <= offset && offset <= node.end) {
      // Check children first (deepest match)
      if (node.children) {
        for (const child of node.children) {
          const found = walk(child);
          if (found) return found;
        }
      }
      if (node.tag && node.startTagEnd && offset <= node.startTagEnd) {
        return {
          tag: node.tag,
          attributes: getNodeAttributes(node, text),
          start: node.start,
          end: node.end,
          node,
        };
      }
    }
    return undefined;
  }

  for (const root of htmlDoc.roots) {
    const found = walk(root);
    if (found) return found;
  }
  return undefined;
}

export type CursorContext =
  | { type: 'attributeName'; partial: string; element: ElementInfo }
  | { type: 'attributeValue'; attrName: string; partial: string; element: ElementInfo }
  | { type: 'none' };

/** Determine the cursor context at a given position */
export function getCursorContext(document: TextDocument, position: Position, htmlDoc: HTMLDocument): CursorContext {
  const offset = document.offsetAt(position);
  const text = document.getText();
  const element = getElementAtOffset(htmlDoc, offset, text);

  if (!element || !element.node.startTagEnd || offset > element.node.startTagEnd) {
    return { type: 'none' };
  }

  // Get the tag content up to cursor
  const tagStart = element.start;
  const beforeCursor = text.substring(tagStart, offset);

  // Check if we're inside an attribute value (inside quotes)
  const lastEq = beforeCursor.lastIndexOf('=');
  if (lastEq !== -1) {
    const afterEq = beforeCursor.substring(lastEq + 1).trimStart();
    if (afterEq.startsWith('"') || afterEq.startsWith("'")) {
      const quote = afterEq[0];
      const valueContent = afterEq.substring(1);
      // Check if the quote is closed
      if (!valueContent.includes(quote)) {
        // We're inside an attribute value
        // Find the attribute name before the =
        const beforeEq = beforeCursor.substring(0, lastEq).trimEnd();
        const nameMatch = beforeEq.match(/(\S+)$/);
        const attrName = nameMatch ? nameMatch[1] : '';
        return {
          type: 'attributeValue',
          attrName,
          partial: valueContent,
          element,
        };
      }
    }
  }

  // Check if we're in an attribute name position
  // After tag name and space, or after a completed attribute
  const afterLastSpace = beforeCursor.match(/\s(\S*)$/);
  if (afterLastSpace) {
    const partial = afterLastSpace[1];
    // Make sure we're not after an = sign that's part of an unclosed attribute
    if (!partial.includes('=')) {
      return {
        type: 'attributeName',
        partial,
        element,
      };
    }
  }

  return { type: 'none' };
}

/** Check if the document likely contains No.JS directives */
export function hasNoJsDirectives(text: string): boolean {
  const directiveNames = getAllDirectiveNames();
  const patterns = getPatterns();

  // Quick scan: look for any known directive attribute in the text
  for (const name of directiveNames) {
    // Simple heuristic: look for the directive as an HTML attribute
    if (text.includes(` ${name}=`) || text.includes(` ${name} `) || text.includes(` ${name}>`)) {
      return true;
    }
  }

  // Check patterns
  for (const p of patterns) {
    if (text.includes(` ${p.prefix}`)) {
      return true;
    }
  }

  // Check for CDN script tag
  if (text.includes('no-js') || text.includes('nojs') || text.includes('NoJS')) {
    return true;
  }

  return false;
}

/** Find all template definitions in the document */
export function findTemplates(htmlDoc: HTMLDocument, text: string): Map<string, { start: number; end: number }> {
  const templates = new Map<string, { start: number; end: number }>();

  function walk(node: HtmlNode) {
    if (node.tag === 'template') {
      const attrs = getNodeAttributes(node, text);
      const idAttr = attrs.find(a => a.name === 'id');
      if (idAttr?.value) {
        templates.set(idAttr.value, { start: node.start, end: node.end });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const root of htmlDoc.roots) {
    walk(root);
  }
  return templates;
}

/** Find all refs in the document */
export function findRefs(htmlDoc: HTMLDocument, text: string): Map<string, { start: number; end: number }> {
  const refs = new Map<string, { start: number; end: number }>();

  function walk(node: HtmlNode) {
    if (node.tag) {
      const attrs = getNodeAttributes(node, text);
      const refAttr = attrs.find(a => a.name === 'ref');
      if (refAttr?.value) {
        refs.set(refAttr.value, { start: node.start, end: node.end });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const root of htmlDoc.roots) {
    walk(root);
  }
  return refs;
}

/** Find all store declarations in the document */
export function findStores(htmlDoc: HTMLDocument, text: string): Map<string, { start: number; end: number }> {
  const stores = new Map<string, { start: number; end: number }>();

  function walk(node: HtmlNode) {
    if (node.tag) {
      const attrs = getNodeAttributes(node, text);
      const storeAttr = attrs.find(a => a.name === 'store');
      if (storeAttr?.value) {
        stores.set(storeAttr.value, { start: node.start, end: node.end });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const root of htmlDoc.roots) {
    walk(root);
  }

  // Also detect stores declared in NoJS.config({ stores: { name: { ... } } })
  const configIdx = text.indexOf('NoJS.config(');
  const storesIdx = configIdx !== -1 ? text.indexOf('stores', configIdx) : -1;
  if (storesIdx !== -1) {
    const colonIdx = text.indexOf('{', text.indexOf(':', storesIdx));
    if (colonIdx !== -1) {
      let depth = 0;
      let blockEnd = -1;
      for (let i = colonIdx; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) { blockEnd = i; break; } }
      }
      if (blockEnd !== -1) {
        const storesBlock = text.substring(colonIdx + 1, blockEnd);
        const entryRegex = /([a-zA-Z_$][\w$]*)\s*:\s*\{/g;
        let entryMatch;
        while ((entryMatch = entryRegex.exec(storesBlock)) !== null) {
          const storeName = entryMatch[1];
          if (!stores.has(storeName)) {
            const nameStart = colonIdx + 1 + entryMatch.index;
            const nameEnd = nameStart + storeName.length;
            stores.set(storeName, { start: nameStart, end: nameEnd });
          }
        }
      }
    }
  }

  return stores;
}

/** Get siblings of a node (nodes sharing the same parent) */
export function getSiblings(node: HtmlNode): HtmlNode[] {
  const parent = node.parent;
  if (!parent || !parent.children) return [];
  return parent.children;
}

/** Get the previous sibling element */
export function getPreviousSibling(node: HtmlNode): HtmlNode | undefined {
  const siblings = getSiblings(node);
  const idx = siblings.indexOf(node);
  if (idx <= 0) return undefined;
  // Walk backwards to find previous element (skip text nodes)
  for (let i = idx - 1; i >= 0; i--) {
    if (siblings[i].tag) return siblings[i];
  }
  return undefined;
}
