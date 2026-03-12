import { TextDocument } from 'vscode-languageserver-textdocument';
import { InlayHint, InlayHintKind, Position, Range } from 'vscode-languageserver/node';
import { onInlayHints } from '../../server/src/providers/inlay-hints';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getInlayHints(content: string): InlayHint[] {
  const mock = createMockDocuments(content);
  const handler = onInlayHints(mock as any);
  return handler({
    textDocument: { uri: mock.doc.uri },
    range: Range.create(Position.create(0, 0), mock.doc.positionAt(content.length)),
  });
}

describe('InlayHintsProvider', () => {
  describe('Loop context variables', () => {
    it('shows $index, $count, $first, $last for each directive', () => {
      const content = '<div each="item in items"></div>';
      const hints = getInlayHints(content);
      expect(hints.length).toBe(1);
      expect(hints[0].label).toContain('$index');
      expect(hints[0].label).toContain('$count');
      expect(hints[0].label).toContain('$first');
      expect(hints[0].label).toContain('$last');
      expect(hints[0].kind).toBe(InlayHintKind.Parameter);
    });

    it('shows $index, $count for foreach directive', () => {
      const content = '<div foreach="item"></div>';
      const hints = getInlayHints(content);
      expect(hints.length).toBe(1);
      expect(hints[0].label).toContain('$index');
      expect(hints[0].label).toContain('$count');
      expect(hints[0].label).not.toContain('$first');
      expect(hints[0].kind).toBe(InlayHintKind.Parameter);
    });

    it('does not show hints for elements without loop directives', () => {
      const content = '<div state="{ x: 1 }"></div>';
      const hints = getInlayHints(content);
      expect(hints.length).toBe(0);
    });
  });

  describe('HTTP method badges', () => {
    it('shows GET badge for get directive with as', () => {
      const content = '<div get="/api/users" as="data"></div>';
      const hints = getInlayHints(content);
      const httpHint = hints.find(h => h.kind === InlayHintKind.Type);
      expect(httpHint).toBeDefined();
      expect(httpHint!.label).toContain('GET');
    });

    it('shows POST badge for post directive with as', () => {
      const content = '<form post="/api/submit" as="result"></form>';
      const hints = getInlayHints(content);
      const httpHint = hints.find(h => h.kind === InlayHintKind.Type);
      expect(httpHint).toBeDefined();
      expect(httpHint!.label).toContain('POST');
    });

    it('does not show badge for HTTP directive without as', () => {
      const content = '<div get="/api/users"></div>';
      const hints = getInlayHints(content);
      const httpHint = hints.find(h => h.kind === InlayHintKind.Type);
      expect(httpHint).toBeUndefined();
    });
  });

  describe('Multiple hints', () => {
    it('shows both loop and HTTP hints on same element', () => {
      const content = '<div each="item in items" get="/api/users" as="data"></div>';
      const hints = getInlayHints(content);
      const paramHint = hints.find(h => h.kind === InlayHintKind.Parameter);
      const typeHint = hints.find(h => h.kind === InlayHintKind.Type);
      expect(paramHint).toBeDefined();
      expect(typeHint).toBeDefined();
    });
  });

  describe('Empty document', () => {
    it('returns empty array for no NoJS content', () => {
      const content = '<div>Hello</div>';
      const hints = getInlayHints(content);
      expect(hints.length).toBe(0);
    });
  });
});
