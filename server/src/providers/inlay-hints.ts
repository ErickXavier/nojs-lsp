/**
 * Inlay Hints Provider
 * - Show loop context variables for `each` (→ $index, $count, etc.)
 * - Show HTTP method badge for `get`/`post`/`put`/`patch`/`delete`
 */
import {
  InlayHintParams,
  InlayHint,
  InlayHintKind,
  Position,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getAllElements } from '../html-parser';
import { isHttpDirective } from '../directive-registry';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

export function onInlayHints(documents: TextDocuments<TextDocument>) {
  return (params: InlayHintParams): InlayHint[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const htmlDoc = parseHtmlDocument(document);
    const elements = getAllElements(htmlDoc, text);
    const hints: InlayHint[] = [];

    // Only process elements within the visible range
    const startOffset = document.offsetAt(params.range.start);
    const endOffset = document.offsetAt(params.range.end);

    for (const el of elements) {
      // Skip elements outside the visible range
      if (el.end < startOffset || el.start > endOffset) continue;

      for (const attr of el.attributes) {
        // each="item in items" → show "→ $index, $count, …"
        if (attr.name === 'each' && attr.value) {
          const hintPos = document.positionAt(attr.valueEnd);
          hints.push({
            position: Position.create(hintPos.line, hintPos.character + 1), // after closing quote
            label: ' → $index, $count, $first, $last, $even, $odd',
            kind: InlayHintKind.Parameter,
            paddingLeft: true,
          });
        }

        // foreach="item" → show loop context vars
        if (attr.name === 'foreach' && attr.value) {
          const hintPos = document.positionAt(attr.valueEnd);
          hints.push({
            position: Position.create(hintPos.line, hintPos.character + 1),
            label: ' → $index, $count, $first, $last, $even, $odd',
            kind: InlayHintKind.Parameter,
            paddingLeft: true,
          });
        }

        // HTTP methods → show method badge
        if (HTTP_METHODS.has(attr.name) && attr.value) {
          const asAttr = el.attributes.find(a => a.name === 'as');
          if (asAttr?.value) {
            const hintPos = document.positionAt(asAttr.valueEnd);
            hints.push({
              position: Position.create(hintPos.line, hintPos.character + 1),
              label: ` ${attr.name.toUpperCase()}`,
              kind: InlayHintKind.Type,
              paddingLeft: true,
            });
          }
        }
      }
    }

    return hints;
  };
}
