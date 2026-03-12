/**
 * Document Symbols Provider
 * Provides an outline of reactive elements in the document:
 * - state declarations → Variable symbol
 * - store declarations → Module symbol
 * - ref declarations → Field symbol
 * - <template id="..."> → Class symbol
 * - route-view elements → Namespace symbol
 */
import {
  DocumentSymbolParams,
  DocumentSymbol,
  SymbolKind,
  Range,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getAllElements } from '../html-parser';

export function onDocumentSymbol(documents: TextDocuments<TextDocument>) {
  return (params: DocumentSymbolParams): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const htmlDoc = parseHtmlDocument(document);
    const elements = getAllElements(htmlDoc, text);
    const symbols: DocumentSymbol[] = [];

    for (const el of elements) {
      for (const attr of el.attributes) {
        // state → Variable
        if (attr.name === 'state') {
          const detail = attr.value ? truncate(attr.value, 50) : '';
          symbols.push(createSymbol(
            `state: ${detail || '{}'}`,
            SymbolKind.Variable,
            document, el.start, el.node.startTagEnd ?? el.end,
            attr.nameStart, attr.nameEnd
          ));
        }

        // store → Module
        if (attr.name === 'store' && attr.value) {
          symbols.push(createSymbol(
            `store: ${attr.value}`,
            SymbolKind.Module,
            document, el.start, el.node.startTagEnd ?? el.end,
            attr.nameStart, attr.nameEnd
          ));
        }

        // ref → Field
        if (attr.name === 'ref' && attr.value) {
          symbols.push(createSymbol(
            `ref: ${attr.value}`,
            SymbolKind.Field,
            document, el.start, el.node.startTagEnd ?? el.end,
            attr.nameStart, attr.nameEnd
          ));
        }

        // computed → Property
        if (attr.name === 'computed' && attr.value) {
          symbols.push(createSymbol(
            `computed: ${attr.value}`,
            SymbolKind.Property,
            document, el.start, el.node.startTagEnd ?? el.end,
            attr.nameStart, attr.nameEnd
          ));
        }

        // watch → Event
        if (attr.name === 'watch' && attr.value) {
          symbols.push(createSymbol(
            `watch: ${attr.value}`,
            SymbolKind.Event,
            document, el.start, el.node.startTagEnd ?? el.end,
            attr.nameStart, attr.nameEnd
          ));
        }
      }

      // <template id="..."> → Class
      if (el.tag === 'template') {
        const idAttr = el.attributes.find(a => a.name === 'id');
        if (idAttr?.value) {
          symbols.push(createSymbol(
            `template: ${idAttr.value}`,
            SymbolKind.Class,
            document, el.start, el.end,
            idAttr.nameStart, idAttr.valueEnd
          ));
        }
      }

      // route-view → Namespace
      if (el.tag === 'route-view' || el.attributes.some(a => a.name === 'route-view')) {
        const srcAttr = el.attributes.find(a => a.name === 'src');
        const name = srcAttr?.value || 'default';
        const routeViewAttr = el.attributes.find(a => a.name === 'route-view');
        symbols.push(createSymbol(
          `route-view: ${name}`,
          SymbolKind.Namespace,
          document, el.start, el.end,
          routeViewAttr?.nameStart ?? el.start,
          routeViewAttr?.nameEnd ?? (el.start + (el.tag?.length ?? 0) + 1)
        ));
      }

      // HTTP methods → Function
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const httpAttr = el.attributes.find(a => a.name === method);
        if (httpAttr?.value) {
          const asAttr = el.attributes.find(a => a.name === 'as');
          const label = asAttr?.value
            ? `${method.toUpperCase()} ${httpAttr.value} → ${asAttr.value}`
            : `${method.toUpperCase()} ${httpAttr.value}`;
          symbols.push(createSymbol(
            label,
            SymbolKind.Function,
            document, el.start, el.node.startTagEnd ?? el.end,
            httpAttr.nameStart, httpAttr.nameEnd
          ));
        }
      }
    }

    return symbols;
  };
}

function createSymbol(
  name: string,
  kind: SymbolKind,
  document: TextDocument,
  rangeStart: number,
  rangeEnd: number,
  selectionStart: number,
  selectionEnd: number
): DocumentSymbol {
  return {
    name,
    kind,
    range: toRange(document, rangeStart, rangeEnd),
    selectionRange: toRange(document, selectionStart, selectionEnd),
  };
}

function toRange(document: TextDocument, start: number, end: number): Range {
  return Range.create(document.positionAt(start), document.positionAt(end));
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
