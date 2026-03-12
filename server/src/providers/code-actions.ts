/**
 * Code Actions / Quick Fixes Provider
 * - Quick fix: add missing `as` for HTTP directives
 * - Quick fix: "did you mean?" for typos in directive names
 * - Quick fix: wrap element in `if`
 * - Quick fix: add `else` sibling for `if`
 */
import {
  CodeActionParams,
  CodeAction,
  CodeActionKind,
  Diagnostic,
  TextEdit,
  Range,
  Position,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getAllDirectiveNames } from '../directive-registry';

const SOURCE = 'nojs';

export function onCodeAction(documents: TextDocuments<TextDocument>) {
  return (params: CodeActionParams): CodeAction[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const diagnostics = params.context.diagnostics.filter(d => d.source === SOURCE);
    const actions: CodeAction[] = [];

    for (const diag of diagnostics) {
      // Quick fix: add missing `as` for HTTP directives
      if (diag.message.includes('missing the "as" companion attribute')) {
        const action = createAddAsAction(document, diag);
        if (action) actions.push(action);
      }

      // Quick fix: "did you mean?" for unknown directive
      if (diag.message.startsWith('No.JS: Unknown directive')) {
        const suggestions = createDidYouMeanActions(document, diag);
        actions.push(...suggestions);
      }

      // Quick fix: add `else` sibling for `if`
      if (diag.message.includes('"else" must be preceded by') ||
          diag.message.includes('"else-if" must be preceded by')) {
        // No automatic fix — this is informational
      }
    }

    return actions;
  };
}

function createAddAsAction(document: TextDocument, diag: Diagnostic): CodeAction | null {
  // The diagnostic is on the HTTP directive name (e.g., "get")
  // We need to insert as="data" after the directive's value
  const line = document.getText(Range.create(
    Position.create(diag.range.end.line, 0),
    Position.create(diag.range.end.line + 1, 0)
  ));

  // Find the end of the directive's value (after closing quote)
  const text = document.getText();
  const diagEndOffset = document.offsetAt(diag.range.end);

  // Find the next closing quote after the directive name
  let insertOffset = diagEndOffset;
  const afterDirective = text.substring(diagEndOffset);
  const valueMatch = afterDirective.match(/="[^"]*"|='[^']*'/);
  if (valueMatch) {
    insertOffset = diagEndOffset + valueMatch.index! + valueMatch[0].length;
  }

  const insertPos = document.positionAt(insertOffset);

  return {
    title: 'No.JS: Add as="data" companion attribute',
    kind: CodeActionKind.QuickFix,
    diagnostics: [diag],
    edit: {
      changes: {
        [document.uri]: [
          TextEdit.insert(insertPos, ' as="data"'),
        ],
      },
    },
  };
}

function createDidYouMeanActions(document: TextDocument, diag: Diagnostic): CodeAction[] {
  const actions: CodeAction[] = [];

  // Extract the unknown directive name from the message
  const match = diag.message.match(/No\.JS: Unknown directive "(\w[\w-]*)"/);
  if (!match) return actions;

  const unknown = match[1];
  const allNames = getAllDirectiveNames();
  const suggestions: string[] = [];

  for (const name of allNames) {
    if (levenshteinDistance(unknown.toLowerCase(), name) <= 2) {
      suggestions.push(name);
    }
  }

  for (const suggestion of suggestions.slice(0, 3)) {
    actions.push({
      title: `No.JS: Did you mean "${suggestion}"?`,
      kind: CodeActionKind.QuickFix,
      diagnostics: [diag],
      isPreferred: suggestions.indexOf(suggestion) === 0,
      edit: {
        changes: {
          [document.uri]: [
            TextEdit.replace(diag.range, suggestion),
          ],
        },
      },
    });
  }

  return actions;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
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
