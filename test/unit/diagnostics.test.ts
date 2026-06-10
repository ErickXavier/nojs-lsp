import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { validateTextDocument } from '../../server/src/providers/diagnostics';

function createDocument(content: string): TextDocument {
  return TextDocument.create('file:///test.html', 'html', 1, content);
}

// Mock connection that captures diagnostics
function createMockConnection() {
  let lastDiagnostics: Diagnostic[] = [];
  return {
    sendDiagnostics: (params: { uri: string; diagnostics: Diagnostic[] }) => {
      lastDiagnostics = params.diagnostics;
    },
    getDiagnostics: () => lastDiagnostics,
  };
}

describe('DiagnosticsProvider', () => {
  describe('Required values', () => {
    it('reports error for directive missing required value', async () => {
      const content = '<div get></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const getError = diagnostics.find(d => d.message.includes('"get" requires a value'));
      expect(getError).toBeDefined();
      expect(getError!.severity).toBe(DiagnosticSeverity.Error);
    });

    it('does not report error for directive with value', async () => {
      const content = '<div get="/api/users"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const getError = diagnostics.find(d => d.message.includes('"get" requires'));
      expect(getError).toBeUndefined();
    });

    it('does not report error for i18n-ns without value', async () => {
      const content = '<main route-view src="templates/" i18n-ns></main>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const nsError = diagnostics.find(d => d.message.includes('"i18n-ns" requires'));
      expect(nsError).toBeUndefined();
    });
  });

  describe('Orphaned else/else-if', () => {
    it('reports error for else without preceding if', async () => {
      const content = '<div><span else>Alt</span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeDefined();
    });

    it('does not report for else after if sibling', async () => {
      const content = '<div><span if="show">Visible</span><span else>Hidden</span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeUndefined();
    });

    it('reports error for sibling else after a loop element (removed in Core v1.15)', async () => {
      const content = '<ul><li each="item in items" bind="item.name"></li><li else>No items found</li></ul>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeDefined();
    });

    it('does not report for else template companion on a loop element', async () => {
      const content = '<ul><li each="item in items" else="no-items-tpl" bind="item.name"></li></ul><template id="no-items-tpl"><p>No items found</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeUndefined();
    });

    it('does not report for else companion using #id template reference', async () => {
      const content = '<ul><li foreach="item in items" else="#no-items-tpl" bind="item.name"></li></ul><template id="no-items-tpl"><p>No items found</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      const tplError = diagnostics.find(d => d.message.includes('referenced but not defined'));
      expect(elseError).toBeUndefined();
      expect(tplError).toBeUndefined();
    });
  });

  describe('Unknown filters', () => {
    it('warns about unknown filter names', async () => {
      const content = '<div bind="name | nonexistentFilter"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarn = diagnostics.find(d => d.message.includes('Unknown filter'));
      expect(filterWarn).toBeDefined();
    });

    it('does not warn about known filters', async () => {
      const content = '<div bind="name | uppercase"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarn = diagnostics.find(d => d.message.includes('Unknown filter'));
      expect(filterWarn).toBeUndefined();
    });
  });

  describe('Invalid animations', () => {
    it('warns about unknown animation name', async () => {
      const content = '<div animate="nonexistent"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const animWarn = diagnostics.find(d => d.message.includes('Unknown animation'));
      expect(animWarn).toBeDefined();
    });

    it('does not warn about valid animation', async () => {
      const content = '<div animate="fadeIn"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const animWarn = diagnostics.find(d => d.message.includes('Unknown animation'));
      expect(animWarn).toBeUndefined();
    });
  });

  describe('No false positives', () => {
    it('does not report diagnostics for plain HTML', async () => {
      const content = '<div class="container"><p>Hello World</p></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('foreach directive', () => {
    it('does not flag foreach without template as an error', async () => {
      const content = '<li foreach="item in items" bind="item.name"></li>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const templateError = diagnostics.find(d => d.message.includes('template'));
      expect(templateError).toBeUndefined();
    });

    it('reports error for foreach without a value', async () => {
      const content = '<li foreach></li>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const reqError = diagnostics.find(d => d.message.includes('"foreach" requires a value'));
      expect(reqError).toBeDefined();
    });
  });

  describe('for directive', () => {
    it('does not flag valid for directive', async () => {
      const content = '<li for="item in items" bind="item.name"></li>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const forError = diagnostics.find(d => d.message.includes('"for"'));
      expect(forError).toBeUndefined();
    });

    it('reports error for for directive without a value', async () => {
      const content = '<li for></li>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const reqError = diagnostics.find(d => d.message.includes('"for" requires a value'));
      expect(reqError).toBeDefined();
    });
  });
});
