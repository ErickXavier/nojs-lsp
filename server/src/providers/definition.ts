/**
 * Go-to-Definition Provider
 * - use="id" → jump to <template id="id">
 * - $refs.name → jump to ref="name" element
 * - $store.name → jump to store with matching name
 */
import {
  DefinitionParams,
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
} from '../html-parser';

export function onDefinition(documents: TextDocuments<TextDocument>) {
  return (params: DefinitionParams): Location | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const htmlDoc = parseHtmlDocument(document);

    // 1. Check if cursor is on a `use` attribute value → go to template definition
    const element = getElementAtOffset(htmlDoc, offset, text);
    if (element) {
      for (const attr of element.attributes) {
        if (attr.name === 'use' && attr.value && attr.valueStart !== -1) {
          if (offset >= attr.valueStart && offset <= attr.valueEnd) {
            const templateId = attr.value.trim();
            const templates = findTemplates(htmlDoc, text);
            const tmpl = templates.get(templateId);
            if (tmpl) {
              return Location.create(
                params.textDocument.uri,
                toRange(document, tmpl.start, tmpl.end)
              );
            }
          }
        }

        // Check `then`, `else` attribute values that reference template IDs
        if ((attr.name === 'then' || attr.name === 'else' || attr.name === 'loading' ||
             attr.name === 'error' || attr.name === 'empty' || attr.name === 'success' ||
             attr.name === 'error-boundary') && attr.value && attr.valueStart !== -1) {
          if (offset >= attr.valueStart && offset <= attr.valueEnd) {
            const templateId = attr.value.trim();
            const templates = findTemplates(htmlDoc, text);
            const tmpl = templates.get(templateId);
            if (tmpl) {
              return Location.create(
                params.textDocument.uri,
                toRange(document, tmpl.start, tmpl.end)
              );
            }
          }
        }
      }
    }

    // 2. Check if cursor is on $refs.name or $store.name in an expression value
    if (element) {
      for (const attr of element.attributes) {
        if (attr.value && attr.valueStart !== -1 &&
            offset >= attr.valueStart && offset <= attr.valueEnd) {
          const valueOffset = offset - attr.valueStart;
          const value = attr.value;

          // Check for $refs.name
          const refsMatch = findContextRefAtOffset(value, valueOffset, '$refs.');
          if (refsMatch) {
            const refs = findRefs(htmlDoc, text);
            const ref = refs.get(refsMatch);
            if (ref) {
              return Location.create(
                params.textDocument.uri,
                toRange(document, ref.start, ref.end)
              );
            }
          }

          // Check for $store.name
          const storeMatch = findContextRefAtOffset(value, valueOffset, '$store.');
          if (storeMatch) {
            const stores = findStores(htmlDoc, text);
            const store = stores.get(storeMatch);
            if (store) {
              return Location.create(
                params.textDocument.uri,
                toRange(document, store.start, store.end)
              );
            }
          }
        }
      }
    }

    return null;
  };
}

/**
 * Given an expression value and cursor offset within it,
 * check if cursor is on a $refs.xxx or $store.xxx reference.
 * Returns the name after the prefix, or null.
 */
function findContextRefAtOffset(value: string, offset: number, prefix: string): string | null {
  // Find all occurrences of the prefix in the value
  let searchStart = 0;
  while (searchStart < value.length) {
    const idx = value.indexOf(prefix, searchStart);
    if (idx === -1) break;

    const nameStart = idx + prefix.length;
    // Extract the identifier after the prefix
    const nameMatch = value.substring(nameStart).match(/^(\w+)/);
    if (nameMatch) {
      const name = nameMatch[1];
      const nameEnd = nameStart + name.length;
      // Check if cursor is within the entire reference (prefix + name)
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
