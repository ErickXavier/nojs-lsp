import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, Range, Position } from 'vscode-languageserver/node';
import { onCodeAction } from '../../server/src/providers/code-actions';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getCodeActions(content: string, diagnostics: Diagnostic[]): CodeAction[] {
  const mock = createMockDocuments(content);
  const handler = onCodeAction(mock as any);
  return handler({
    textDocument: { uri: mock.doc.uri },
    range: Range.create(Position.create(0, 0), Position.create(0, content.length)),
    context: {
      diagnostics,
      only: undefined,
      triggerKind: undefined as any,
    },
  });
}

function makeDiag(message: string, startChar: number, endChar: number): Diagnostic {
  return {
    range: Range.create(Position.create(0, startChar), Position.create(0, endChar)),
    message,
    severity: DiagnosticSeverity.Warning,
    source: 'nojs',
  };
}

describe('CodeActionsProvider', () => {
  describe('Add missing "as" companion', () => {
    it('suggests adding as="data" for HTTP directive without as', () => {
      const content = '<div get="/api/users"></div>';
      const diag = makeDiag(
        'No.JS: HTTP directive "get" is missing the "as" companion attribute to bind the response data.',
        5, 8 // "get"
      );
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBe(1);
      expect(actions[0].title).toBe('No.JS: Add as="data" companion attribute');
      expect(actions[0].kind).toBe(CodeActionKind.QuickFix);
      expect(actions[0].edit).toBeDefined();
    });

    it('does not produce action for non-matching diagnostic', () => {
      const content = '<div get="/api/users"></div>';
      const diag = makeDiag('Some other error', 5, 8);
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBe(0);
    });
  });

  describe('Did you mean? suggestions', () => {
    it('suggests similar directives for typos', () => {
      const content = '<div sate="{ x: 1 }"></div>';
      const diag = makeDiag(
        'No.JS: Unknown directive "sate". Did you mean one of the known directives?',
        5, 9 // "sate"
      );
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBeGreaterThan(0);
      const titles = actions.map(a => a.title);
      expect(titles.some(t => t.includes('state'))).toBe(true);
    });

    it('marks first suggestion as preferred', () => {
      const content = '<div sate="{ x: 1 }"></div>';
      const diag = makeDiag(
        'No.JS: Unknown directive "sate". Did you mean one of the known directives?',
        5, 9
      );
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].isPreferred).toBe(true);
    });

    it('returns at most 3 suggestions', () => {
      const content = '<div ech="item in items"></div>';
      const diag = makeDiag(
        'No.JS: Unknown directive "ech". Did you mean one of the known directives?',
        5, 8
      );
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBeLessThanOrEqual(3);
    });

    it('uses QuickFix kind with text edit replacing the name', () => {
      const content = '<div sate="{ x: 1 }"></div>';
      const diag = makeDiag(
        'No.JS: Unknown directive "sate". Did you mean one of the known directives?',
        5, 9
      );
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].kind).toBe(CodeActionKind.QuickFix);
      const changes = actions[0].edit?.changes;
      expect(changes).toBeDefined();
    });
  });

  describe('Filtering by source', () => {
    it('ignores diagnostics from other sources', () => {
      const content = '<div get="/api/users"></div>';
      const diag: Diagnostic = {
        range: Range.create(Position.create(0, 5), Position.create(0, 8)),
        message: 'No.JS: HTTP directive "get" is missing the "as" companion attribute to bind the response data.',
        severity: DiagnosticSeverity.Warning,
        source: 'other-source',
      };
      const actions = getCodeActions(content, [diag]);
      expect(actions.length).toBe(0);
    });
  });

  describe('Empty diagnostics', () => {
    it('returns empty array when no diagnostics', () => {
      const content = '<div state="{ x: 1 }"></div>';
      const actions = getCodeActions(content, []);
      expect(actions.length).toBe(0);
    });
  });
});
