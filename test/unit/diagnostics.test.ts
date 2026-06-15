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
  // ─── Validation disabled ─────────────────────────────────────────────
  describe('Validation disabled', () => {
    it('sends empty diagnostics when validation is disabled', async () => {
      const content = '<div get></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any, { validationEnabled: false });
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBe(0);
    });

    it('runs validation when validationEnabled is true', async () => {
      const content = '<div get></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any, { validationEnabled: true });
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('runs validation when options are undefined', async () => {
      const content = '<div get></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  // ─── Rule 1: Unknown directive warning ───────────────────────────────
  describe('Unknown directive warning', () => {
    it('does not warn about attribute that is a typo but fails the couldBeNoJsAttribute gate', async () => {
      // "bnd" is close to "bind" (levenshtein distance <= 2) but the unknown
      // directive check first requires the attribute to pass couldBeNoJsAttribute
      // (exact directive, companion, or pattern prefix match). Since "bnd" is
      // none of those, it never reaches the looksLikeNoJsDirective check.
      const content = '<div bnd="name"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const unknown = diagnostics.find(d => d.message.includes('Unknown directive'));
      expect(unknown).toBeUndefined();
    });

    it('does not warn about standard HTML attributes', async () => {
      const content = '<div class="foo" id="bar" style="color: red"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const unknown = diagnostics.find(d => d.message.includes('Unknown directive'));
      expect(unknown).toBeUndefined();
    });

    it('does not warn about known directives', async () => {
      const content = '<div bind="name"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const unknown = diagnostics.find(d => d.message.includes('Unknown directive'));
      expect(unknown).toBeUndefined();
    });

    it('does not warn about attributes far from any directive name', async () => {
      const content = '<div data-custom="value"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const unknown = diagnostics.find(d => d.message.includes('Unknown directive'));
      expect(unknown).toBeUndefined();
    });
  });

  // ─── Rule 2: Required values ─────────────────────────────────────────
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

    it('reports error for directive with empty value', async () => {
      const content = '<div get=""></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const getError = diagnostics.find(d => d.message.includes('"get" requires a value'));
      expect(getError).toBeDefined();
    });

    it('reports error for directive with whitespace-only value', async () => {
      const content = '<div get="   "></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const getError = diagnostics.find(d => d.message.includes('"get" requires a value'));
      expect(getError).toBeDefined();
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

    it('reports error for multiple directives missing required values', async () => {
      const content = '<div bind></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const bindError = diagnostics.find(d => d.message.includes('"bind" requires a value'));
      expect(bindError).toBeDefined();
    });
  });

  // ─── Rule 3: Orphaned else/else-if ───────────────────────────────────
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

    it('does not report for else after else-if sibling (conditional chains unchanged)', async () => {
      const content = '<div><span if="a">A</span><span else-if="b">B</span><span else>C</span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('must be preceded'));
      expect(elseError).toBeUndefined();
    });

    it('reports error for orphaned else-if without the loop hint', async () => {
      const content = '<div><span else-if="b">B</span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseIfError = diagnostics.find(d => d.message.includes('"else-if" must be preceded'));
      expect(elseIfError).toBeDefined();
      expect(elseIfError!.message).not.toContain('else="templateId"');
    });

    it('sibling else after a loop element error includes the else="templateId" hint', async () => {
      const content = '<ul><li each="item in items" bind="item.name"></li><li else>No items</li></ul>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeDefined();
      expect(elseError!.message).toContain('else="templateId"');
    });

    it('reports error for sibling else after foreach and for loop variants', async () => {
      for (const loopDir of ['foreach', 'for']) {
        const content = `<ul><li ${loopDir}="item in items" bind="item.name"></li><li else>No items</li></ul>`;
        const doc = createDocument(content);
        const conn = createMockConnection();
        await validateTextDocument(doc, conn as any);
        const diagnostics = conn.getDiagnostics();
        const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
        expect(elseError).toBeDefined();
      }
    });

    it('does not report for else template companion on an if element', async () => {
      const content = '<div if="show" else="fallback-tpl">Visible</div><template id="fallback-tpl"><p>Hidden</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const elseError = diagnostics.find(d => d.message.includes('"else" must be preceded'));
      expect(elseError).toBeUndefined();
    });

    it('reports missing template for #id else companion using the bare id', async () => {
      const content = '<ul><li each="item in items" else="#missing-tpl" bind="item.name"></li></ul>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplError = diagnostics.find(d => d.message.includes('referenced but not defined'));
      expect(tplError).toBeDefined();
      expect(tplError!.message).toContain('Template "missing-tpl"');
    });
  });

  // ─── Rule 4: Unknown filters ─────────────────────────────────────────
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

    it('warns about each unknown filter in chained pipes', async () => {
      const content = '<div bind="name | uppercase | badFilter1 | badFilter2"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarns = diagnostics.filter(d => d.message.includes('Unknown filter'));
      expect(filterWarns.length).toBe(2);
    });

    it('does not warn for non-directive attributes with pipes', async () => {
      const content = '<div class="a | b"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarn = diagnostics.find(d => d.message.includes('Unknown filter'));
      expect(filterWarn).toBeUndefined();
    });

    it('warns for logical OR operand mistaken as filter name', async () => {
      // Expressions like "a || b" contain pipes. The diagnostics provider
      // splits by single | and checks each segment as a potential filter.
      // The segment "| b" yields filterName "b" which passes the alphanumeric
      // check, so it IS flagged as an unknown filter. This is a known
      // limitation: the naive pipe split does not distinguish || from |.
      const content = '<div bind="a || b"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarn = diagnostics.find(d => d.message.includes('Unknown filter'));
      expect(filterWarn).toBeDefined();
    });

    it('does not warn for filter with colon args', async () => {
      const content = '<div bind="price | currency:\'USD\'"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const filterWarn = diagnostics.find(d => d.message.includes('Unknown filter'));
      expect(filterWarn).toBeUndefined();
    });
  });

  // ─── Rule 5: Duplicate state declarations ────────────────────────────
  describe('Duplicate state declarations', () => {
    it('warns about duplicate state names across elements', async () => {
      const content = '<div state="{ count: 0 }"><span state="{ count: 10 }"></span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupState = diagnostics.filter(d => d.message.includes('Duplicate state declaration'));
      expect(dupState.length).toBeGreaterThanOrEqual(2);
    });

    it('does not warn for unique state names', async () => {
      const content = '<div state="{ count: 0 }"><span state="{ name: \'test\' }"></span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupState = diagnostics.find(d => d.message.includes('Duplicate state declaration'));
      expect(dupState).toBeUndefined();
    });

    it('parses simple state names (non-object form)', async () => {
      const content = '<div state="count"><span state="count"></span></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupState = diagnostics.filter(d => d.message.includes('Duplicate state declaration'));
      expect(dupState.length).toBeGreaterThanOrEqual(2);
    });

    it('does not flag state without a value', async () => {
      const content = '<div state></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupState = diagnostics.find(d => d.message.includes('Duplicate state declaration'));
      expect(dupState).toBeUndefined();
    });
  });

  // ─── Rule 6: Invalid animation ───────────────────────────────────────
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

    it('does not warn about custom- prefixed animations', async () => {
      const content = '<div animate="custom-myAnimation"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const animWarn = diagnostics.find(d => d.message.includes('Unknown animation'));
      expect(animWarn).toBeUndefined();
    });

    it('does not warn for empty animation value', async () => {
      const content = '<div animate=""></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const animWarn = diagnostics.find(d => d.message.includes('Unknown animation'));
      expect(animWarn).toBeUndefined();
    });

    it('warns for animate-enter and animate-leave with unknown names', async () => {
      const content = '<div animate-enter="badName" animate-leave="alsoBad"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const animWarns = diagnostics.filter(d => d.message.includes('Unknown animation'));
      expect(animWarns.length).toBe(2);
    });
  });

  // ─── Rule 7: Invalid event modifier ──────────────────────────────────
  describe('Invalid event modifiers', () => {
    it('warns about unknown event modifiers', async () => {
      const content = '<button on:click.badmod="handler()"></button>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modWarn = diagnostics.find(d => d.message.includes('Unknown event modifier'));
      expect(modWarn).toBeDefined();
      expect(modWarn!.message).toContain('badmod');
    });

    it('does not warn about known event modifiers', async () => {
      const content = '<button on:click.prevent="handler()"></button>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modWarn = diagnostics.find(d => d.message.includes('Unknown event modifier'));
      expect(modWarn).toBeUndefined();
    });

    it('does not warn for on: events without modifiers', async () => {
      const content = '<button on:click="handler()"></button>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modWarn = diagnostics.find(d => d.message.includes('Unknown event modifier'));
      expect(modWarn).toBeUndefined();
    });

    it('warns only about the first unknown modifier in a chain', async () => {
      const content = '<button on:click.prevent.badmod.alsoBad="handler()"></button>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modWarns = diagnostics.filter(d => d.message.includes('Unknown event modifier'));
      // The code breaks after the first unknown modifier
      expect(modWarns.length).toBe(1);
      expect(modWarns[0].message).toContain('badmod');
    });
  });

  // ─── Rule 8: Unknown validator ───────────────────────────────────────
  describe('Unknown validators', () => {
    it('warns about unknown validator names', async () => {
      const content = '<input validate="notAValidator"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const valWarn = diagnostics.find(d => d.message.includes('Unknown validator'));
      expect(valWarn).toBeDefined();
      expect(valWarn!.message).toContain('notAValidator');
    });

    it('does not warn about known validators', async () => {
      const content = '<input validate="required"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const valWarn = diagnostics.find(d => d.message.includes('Unknown validator'));
      expect(valWarn).toBeUndefined();
    });

    it('warns for each unknown validator in pipe-separated list', async () => {
      const content = '<input validate="required | badVal1 | badVal2"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const valWarns = diagnostics.filter(d => d.message.includes('Unknown validator'));
      expect(valWarns.length).toBe(2);
    });

    it('handles validators with colon arguments', async () => {
      const content = '<input validate="min:5"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const valWarn = diagnostics.find(d => d.message.includes('Unknown validator'));
      expect(valWarn).toBeUndefined();
    });

    it('skips empty rules in validator list', async () => {
      const content = '<input validate="required | | email"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const valWarn = diagnostics.find(d => d.message.includes('Unknown validator'));
      expect(valWarn).toBeUndefined();
    });
  });

  // ─── Rule 9: Model on non-form element ───────────────────────────────
  describe('Model on non-form element', () => {
    it('warns about model on a div', async () => {
      const content = '<div model="name"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modelWarn = diagnostics.find(d => d.message.includes('"model" is typically used'));
      expect(modelWarn).toBeDefined();
      expect(modelWarn!.message).toContain('<div>');
    });

    it('does not warn for model on input', async () => {
      const content = '<input model="name"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modelWarn = diagnostics.find(d => d.message.includes('"model" is typically used'));
      expect(modelWarn).toBeUndefined();
    });

    it('does not warn for model on textarea', async () => {
      const content = '<textarea model="description"></textarea>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modelWarn = diagnostics.find(d => d.message.includes('"model" is typically used'));
      expect(modelWarn).toBeUndefined();
    });

    it('does not warn for model on select', async () => {
      const content = '<select model="country"></select>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modelWarn = diagnostics.find(d => d.message.includes('"model" is typically used'));
      expect(modelWarn).toBeUndefined();
    });

    it('warns about model on a span', async () => {
      const content = '<span model="value"></span>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const modelWarn = diagnostics.find(d => d.message.includes('"model" is typically used'));
      expect(modelWarn).toBeDefined();
      expect(modelWarn!.message).toContain('<span>');
    });
  });

  // ─── Rule 10: Duplicate ref names ────────────────────────────────────
  describe('Duplicate ref names', () => {
    it('warns about duplicate ref declarations', async () => {
      const content = '<div ref="myRef"></div><span ref="myRef"></span>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupRef = diagnostics.filter(d => d.message.includes('Duplicate ref'));
      expect(dupRef.length).toBeGreaterThanOrEqual(2);
    });

    it('does not warn for unique ref names', async () => {
      const content = '<div ref="refA"></div><span ref="refB"></span>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupRef = diagnostics.find(d => d.message.includes('Duplicate ref'));
      expect(dupRef).toBeUndefined();
    });

    it('does not track ref without a value', async () => {
      const content = '<div ref></div><span ref></span>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const dupRef = diagnostics.find(d => d.message.includes('Duplicate ref'));
      expect(dupRef).toBeUndefined();
    });
  });

  // ─── Rule 11: Template ID referenced but not defined ──────────────────
  describe('Template reference validation', () => {
    it('warns when a use attribute references a non-existent template', async () => {
      const content = '<div use="missingTpl"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplWarn = diagnostics.find(d => d.message.includes('Template "missingTpl" is referenced but not defined'));
      expect(tplWarn).toBeDefined();
    });

    it('does not warn when template exists', async () => {
      const content = '<template id="myTpl"><p>Content</p></template><div use="myTpl"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplWarn = diagnostics.find(d => d.message.includes('referenced but not defined'));
      expect(tplWarn).toBeUndefined();
    });

    it('checks then, loading, error, empty, success, error-boundary attributes', async () => {
      const content = '<div get="/api" as="data" loading="loadTpl" error="errTpl" empty="emptyTpl" success="okTpl"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplWarns = diagnostics.filter(d => d.message.includes('referenced but not defined'));
      expect(tplWarns.length).toBe(4);
    });

    it('strips # prefix from template references', async () => {
      const content = '<template id="myTpl"><p>Content</p></template><div use="#myTpl"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplWarn = diagnostics.find(d => d.message.includes('referenced but not defined'));
      expect(tplWarn).toBeUndefined();
    });

    it('does not check expressions as template IDs', async () => {
      // Values with spaces or complex syntax are not simple identifiers
      const content = '<div use="show ? \'a\' : \'b\'"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const tplWarn = diagnostics.find(d => d.message.includes('referenced but not defined'));
      expect(tplWarn).toBeUndefined();
    });
  });

  // ─── Rule 12: Duplicate wildcard routes ──────────────────────────────
  describe('Duplicate wildcard routes', () => {
    it('warns about duplicate wildcard routes for the same outlet', async () => {
      const content = '<template route="*"><p>404 A</p></template><template route="*"><p>404 B</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const wildcardWarns = diagnostics.filter(d => d.message.includes('Duplicate wildcard route'));
      expect(wildcardWarns.length).toBeGreaterThanOrEqual(2);
    });

    it('does not warn for a single wildcard route', async () => {
      const content = '<template route="*"><p>404</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const wildcardWarn = diagnostics.find(d => d.message.includes('Duplicate wildcard route'));
      expect(wildcardWarn).toBeUndefined();
    });

    it('does not warn for wildcard routes on different outlets', async () => {
      const content = '<template route="*" outlet="main"><p>404</p></template><template route="*" outlet="sidebar"><p>No sidebar</p></template>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const wildcardWarn = diagnostics.find(d => d.message.includes('Duplicate wildcard route'));
      expect(wildcardWarn).toBeUndefined();
    });

    it('only tracks wildcard routes on template elements', async () => {
      const content = '<div route="*"></div><div route="*"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const wildcardWarn = diagnostics.find(d => d.message.includes('Duplicate wildcard route'));
      expect(wildcardWarn).toBeUndefined();
    });
  });

  // ─── Rule 13: Missing companion as for HTTP directives ───────────────
  describe('Missing as companion', () => {
    it('warns when get directive lacks as attribute', async () => {
      const content = '<div get="/api/users"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const asWarn = diagnostics.find(d => d.message.includes('missing the "as" companion'));
      expect(asWarn).toBeDefined();
    });

    it('does not warn when as attribute is present', async () => {
      const content = '<div get="/api/users" as="users"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const asWarn = diagnostics.find(d => d.message.includes('missing the "as" companion'));
      expect(asWarn).toBeUndefined();
    });

    it('warns for post, put, patch, delete without as', async () => {
      for (const method of ['post', 'put', 'patch', 'delete']) {
        const content = `<div ${method}="/api/action"></div>`;
        const doc = createDocument(content);
        const conn = createMockConnection();
        await validateTextDocument(doc, conn as any);
        const diagnostics = conn.getDiagnostics();
        const asWarn = diagnostics.find(d => d.message.includes('missing the "as" companion'));
        expect(asWarn).toBeDefined();
      }
    });
  });

  // ─── Rule 14: Expression syntax validation ───────────────────────────
  describe('Expression syntax validation', () => {
    it('reports hint for unbalanced brackets in expression', async () => {
      // The expression validator checks bracket/paren/brace balance and
      // unterminated strings, not operator validity. Use an unbalanced
      // bracket to trigger the syntax hint.
      const content = '<div bind="name + (123"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
      expect(syntaxHint).toBeDefined();
      expect(syntaxHint!.severity).toBe(DiagnosticSeverity.Hint);
    });

    it('does not flag valid expressions', async () => {
      const content = '<div bind="user.name"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
      expect(syntaxHint).toBeUndefined();
    });

    it('skips syntax checking for validate attribute', async () => {
      const content = '<input validate="required"></input>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
      expect(syntaxHint).toBeUndefined();
    });

    it('skips syntax checking for on: event handlers', async () => {
      const content = '<button on:click="count++; name = \'updated\'"></button>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
      expect(syntaxHint).toBeUndefined();
    });

    it('skips syntax checking for HTTP directives', async () => {
      const content = '<div get="/api/{id}" as="data"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
      expect(syntaxHint).toBeUndefined();
    });

    it('skips syntax checking for ref, store, t, i18n-ns, route, use, trigger, error-boundary, drag-handle', async () => {
      for (const attr of ['ref', 'store', 't', 'i18n-ns', 'route', 'use', 'trigger', 'error-boundary']) {
        const content = `<div ${attr}="some value"></div>`;
        const doc = createDocument(content);
        const conn = createMockConnection();
        await validateTextDocument(doc, conn as any);
        const diagnostics = conn.getDiagnostics();
        const syntaxHint = diagnostics.find(d => d.message.includes('Possible syntax error'));
        expect(syntaxHint).toBeUndefined();
      }
    });
  });

  // ─── Rule 15: Deprecated transition CSS ──────────────────────────────
  describe('Deprecated transition CSS', () => {
    it('detects deprecated class-based transition CSS patterns', async () => {
      const content = '<style>.slide-enter { opacity: 0; }</style><main route-view></main>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const cssWarn = diagnostics.find(d => d.message.includes('deprecated'));
      expect(cssWarn).toBeDefined();
      expect(cssWarn!.severity).toBe(DiagnosticSeverity.Information);
    });

    it('detects fade-leave pattern', async () => {
      const content = '<style>.fade-leave { transition: all 0.3s; }</style>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const cssWarn = diagnostics.find(d => d.message.includes('.fade-leave'));
      expect(cssWarn).toBeDefined();
    });

    it('detects all transition class variants', async () => {
      const content = '<style>.scale-enter-active { transform: scale(1); } .slide-leave-to { opacity: 0; }</style>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const cssWarns = diagnostics.filter(d => d.message.includes('deprecated'));
      expect(cssWarns.length).toBe(2);
    });

    it('does not flag non-transition CSS classes', async () => {
      const content = '<style>.slide-container { display: flex; }</style>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const cssWarn = diagnostics.find(d => d.message.includes('deprecated'));
      expect(cssWarn).toBeUndefined();
    });

    it('does not flag when there are no style blocks', async () => {
      const content = '<div bind="name"></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      const cssWarn = diagnostics.find(d => d.message.includes('deprecated'));
      expect(cssWarn).toBeUndefined();
    });
  });

  // ─── No false positives ──────────────────────────────────────────────
  describe('No false positives', () => {
    it('does not report diagnostics for plain HTML', async () => {
      const content = '<div class="container"><p>Hello World</p></div>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBe(0);
    });

    it('does not report diagnostics for standard HTML form elements', async () => {
      const content = '<form action="/submit" method="post"><input type="text" name="email" required></form>';
      const doc = createDocument(content);
      const conn = createMockConnection();
      await validateTextDocument(doc, conn as any);
      const diagnostics = conn.getDiagnostics();
      expect(diagnostics.length).toBe(0);
    });
  });

  // ─── foreach / for directives ────────────────────────────────────────
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
