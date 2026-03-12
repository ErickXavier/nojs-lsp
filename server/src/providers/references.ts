/**
 * Find References Provider
 * - Template ID: find all use="id", then="id", else="id", loading="id", error="id", etc.
 * - Ref name: find all $refs.name references + the ref="name" declaration
 * - Store name: find all $store.name references + the store="name" declaration
 */
import {
  ReferenceParams,
  Location,
  Range,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  parseHtmlDocument,
  getAllElements,
  getElementAtOffset,
  findTemplates,
  findRefs,
  findStores,
  ElementInfo,
} from '../html-parser';

/** Attributes whose values can reference template IDs */
const TEMPLATE_REF_ATTRS = new Set([
  'use', 'then', 'else', 'loading', 'error', 'empty', 'success',
  'error-boundary', 'template',
]);

export function onReferences(documents: TextDocuments<TextDocument>) {
  return (params: ReferenceParams): Location[] | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const htmlDoc = parseHtmlDocument(document);
    const elements = getAllElements(htmlDoc, text);

    const element = getElementAtOffset(htmlDoc, offset, text);
    if (!element) return null;

    // 1. Check if cursor is on a template id declaration or a template-referencing value
    for (const attr of element.attributes) {
      // On <template id="xxx"> → find all references to this template ID
      if (element.tag === 'template' && attr.name === 'id' && attr.value && attr.valueStart !== -1) {
        if (offset >= attr.nameStart && offset <= attr.valueEnd) {
          return findTemplateIdReferences(attr.value, elements, document, params);
        }
      }

      // On use="xxx" or then="xxx" etc. → find all references to this template ID
      if (TEMPLATE_REF_ATTRS.has(attr.name) && attr.value && attr.valueStart !== -1) {
        if (offset >= attr.valueStart && offset <= attr.valueEnd) {
          return findTemplateIdReferences(attr.value.trim(), elements, document, params);
        }
      }

      // On ref="xxx" → find all $refs.xxx references
      if (attr.name === 'ref' && attr.value && attr.valueStart !== -1) {
        if (offset >= attr.nameStart && offset <= attr.valueEnd) {
          return findRefReferences(attr.value.trim(), elements, document, params);
        }
      }

      // On store="xxx" → find all $store.xxx references
      if (attr.name === 'store' && attr.value && attr.valueStart !== -1) {
        if (offset >= attr.nameStart && offset <= attr.valueEnd) {
          return findStoreReferences(attr.value.trim(), elements, document, params);
        }
      }

      // On $refs.name or $store.name inside expression values
      if (attr.value && attr.valueStart !== -1 &&
          offset >= attr.valueStart && offset <= attr.valueEnd) {
        const valueOffset = offset - attr.valueStart;
        const value = attr.value;

        const refsName = findContextRefAtOffset(value, valueOffset, '$refs.');
        if (refsName) {
          return findRefReferences(refsName, elements, document, params);
        }

        const storeName = findContextRefAtOffset(value, valueOffset, '$store.');
        if (storeName) {
          return findStoreReferences(storeName, elements, document, params);
        }
      }
    }

    return null;
  };
}

function findTemplateIdReferences(
  templateId: string,
  elements: ElementInfo[],
  document: TextDocument,
  params: ReferenceParams
): Location[] {
  const locations: Location[] = [];

  for (const el of elements) {
    // Include the declaration itself if requested
    if (params.context.includeDeclaration && el.tag === 'template') {
      const idAttr = el.attributes.find(a => a.name === 'id' && a.value === templateId);
      if (idAttr) {
        locations.push(Location.create(
          params.textDocument.uri,
          toRange(document, idAttr.valueStart, idAttr.valueEnd)
        ));
      }
    }

    // Find all attributes that reference this template ID
    for (const attr of el.attributes) {
      if (TEMPLATE_REF_ATTRS.has(attr.name) && attr.value?.trim() === templateId) {
        locations.push(Location.create(
          params.textDocument.uri,
          toRange(document, attr.valueStart, attr.valueEnd)
        ));
      }
    }
  }

  return locations;
}

function findRefReferences(
  refName: string,
  elements: ElementInfo[],
  document: TextDocument,
  params: ReferenceParams
): Location[] {
  const locations: Location[] = [];
  const pattern = `$refs.${refName}`;

  for (const el of elements) {
    for (const attr of el.attributes) {
      // Include the ref declaration
      if (params.context.includeDeclaration && attr.name === 'ref' && attr.value?.trim() === refName) {
        locations.push(Location.create(
          params.textDocument.uri,
          toRange(document, attr.valueStart, attr.valueEnd)
        ));
      }

      // Find $refs.name in expression values
      if (attr.value && attr.value.includes(pattern)) {
        let searchStart = 0;
        while (searchStart < attr.value.length) {
          const idx = attr.value.indexOf(pattern, searchStart);
          if (idx === -1) break;
          const refStart = attr.valueStart + idx;
          const refEnd = refStart + pattern.length;
          locations.push(Location.create(
            params.textDocument.uri,
            toRange(document, refStart, refEnd)
          ));
          searchStart = idx + 1;
        }
      }
    }
  }

  return locations;
}

function findStoreReferences(
  storeName: string,
  elements: ElementInfo[],
  document: TextDocument,
  params: ReferenceParams
): Location[] {
  const locations: Location[] = [];
  const pattern = `$store.${storeName}`;

  for (const el of elements) {
    for (const attr of el.attributes) {
      // Include the store declaration
      if (params.context.includeDeclaration && attr.name === 'store' && attr.value?.trim() === storeName) {
        locations.push(Location.create(
          params.textDocument.uri,
          toRange(document, attr.valueStart, attr.valueEnd)
        ));
      }

      // Find $store.name in expression values
      if (attr.value && attr.value.includes(pattern)) {
        let searchStart = 0;
        while (searchStart < attr.value.length) {
          const idx = attr.value.indexOf(pattern, searchStart);
          if (idx === -1) break;
          const storeStart = attr.valueStart + idx;
          const storeEnd = storeStart + pattern.length;
          locations.push(Location.create(
            params.textDocument.uri,
            toRange(document, storeStart, storeEnd)
          ));
          searchStart = idx + 1;
        }
      }
    }
  }

  return locations;
}

function findContextRefAtOffset(value: string, offset: number, prefix: string): string | null {
  let searchStart = 0;
  while (searchStart < value.length) {
    const idx = value.indexOf(prefix, searchStart);
    if (idx === -1) break;
    const nameStart = idx + prefix.length;
    const nameMatch = value.substring(nameStart).match(/^(\w+)/);
    if (nameMatch) {
      const name = nameMatch[1];
      const nameEnd = nameStart + name.length;
      if (offset >= idx && offset <= nameEnd) {
        return name;
      }
    }
    searchStart = idx + 1;
  }
  return null;
}

function toRange(document: TextDocument, start: number, end: number): Range {
  return Range.create(document.positionAt(start), document.positionAt(end));
}
