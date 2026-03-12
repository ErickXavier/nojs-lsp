/**
 * Document Links Provider
 * - HTTP directive URLs (get="/api/users") as clickable links
 * - Template src attributes as file links
 * - route-view src as directory link
 */
import {
  DocumentLinkParams,
  DocumentLink,
  Range,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getAllElements } from '../html-parser';
import { isHttpDirective } from '../directive-registry';

const HTTP_URL_PATTERN = /^https?:\/\//;
const ABSOLUTE_PATH_PATTERN = /^\//;

export function onDocumentLinks(documents: TextDocuments<TextDocument>) {
  return (params: DocumentLinkParams): DocumentLink[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const htmlDoc = parseHtmlDocument(document);
    const elements = getAllElements(htmlDoc, text);
    const links: DocumentLink[] = [];

    for (const el of elements) {
      for (const attr of el.attributes) {
        if (!attr.value || attr.valueStart === -1) continue;
        const value = attr.value.trim();
        if (!value) continue;

        // HTTP directive URLs (get, post, put, patch, delete)
        if (isHttpDirective(attr.name) && isLinkableUrl(value)) {
          links.push({
            range: toRange(document, attr.valueStart, attr.valueEnd),
            target: resolveUrl(value, document.uri),
            tooltip: `${attr.name.toUpperCase()} ${value}`,
          });
        }

        // call directive URL
        if (attr.name === 'call' && isLinkableUrl(value)) {
          links.push({
            range: toRange(document, attr.valueStart, attr.valueEnd),
            target: resolveUrl(value, document.uri),
            tooltip: `CALL ${value}`,
          });
        }

        // src attributes on template/route-view elements
        if (attr.name === 'src') {
          if (el.tag === 'route-view' || el.tag === 'template' ||
              el.attributes.some(a => a.name === 'route-view')) {
            // File/directory links - these are relative paths
            if (!value.startsWith('$') && !value.startsWith('{')) {
              links.push({
                range: toRange(document, attr.valueStart, attr.valueEnd),
                tooltip: `Open: ${value}`,
              });
            }
          }
        }

        // redirect attribute URLs
        if (attr.name === 'redirect' && (isLinkableUrl(value) || value.startsWith('/'))) {
          links.push({
            range: toRange(document, attr.valueStart, attr.valueEnd),
            target: resolveUrl(value, document.uri),
            tooltip: `Redirect to ${value}`,
          });
        }
      }
    }

    return links;
  };
}

function isLinkableUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value) || ABSOLUTE_PATH_PATTERN.test(value);
}

function resolveUrl(value: string, _documentUri: string): string | undefined {
  // For full HTTP URLs, return as-is
  if (HTTP_URL_PATTERN.test(value)) {
    return value;
  }
  // For API paths (e.g., /api/users), we don't know the base URL
  // Return undefined to let the editor handle it
  return undefined;
}

function toRange(document: TextDocument, start: number, end: number): Range {
  return Range.create(document.positionAt(start), document.positionAt(end));
}
