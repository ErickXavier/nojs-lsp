import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import { onDocumentSymbol } from '../../server/src/providers/symbols';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getSymbols(content: string): DocumentSymbol[] {
  const mock = createMockDocuments(content);
  const handler = onDocumentSymbol(mock as any);
  return handler({
    textDocument: { uri: mock.doc.uri },
  });
}

describe('DocumentSymbolsProvider', () => {
  it('reports state declarations as Variable symbols', () => {
    const content = '<div state="{ count: 0, name: \'test\' }"></div>';
    const symbols = getSymbols(content);
    const stateSymbol = symbols.find(s => s.kind === SymbolKind.Variable);
    expect(stateSymbol).toBeDefined();
    expect(stateSymbol!.name).toContain('state');
  });

  it('reports store declarations as Module symbols', () => {
    const content = '<div store="cart" value="{ items: [] }"></div>';
    const symbols = getSymbols(content);
    const storeSymbol = symbols.find(s => s.kind === SymbolKind.Module);
    expect(storeSymbol).toBeDefined();
    expect(storeSymbol!.name).toContain('cart');
  });

  it('reports ref declarations as Field symbols', () => {
    const content = '<input ref="myInput" />';
    const symbols = getSymbols(content);
    const refSymbol = symbols.find(s => s.kind === SymbolKind.Field);
    expect(refSymbol).toBeDefined();
    expect(refSymbol!.name).toContain('myInput');
  });

  it('reports template declarations as Class symbols', () => {
    const content = '<template id="card-tpl"><p>Card</p></template>';
    const symbols = getSymbols(content);
    const tplSymbol = symbols.find(s => s.kind === SymbolKind.Class);
    expect(tplSymbol).toBeDefined();
    expect(tplSymbol!.name).toContain('card-tpl');
  });

  it('reports HTTP methods as Function symbols', () => {
    const content = '<div get="/api/users" as="users"></div>';
    const symbols = getSymbols(content);
    const httpSymbol = symbols.find(s => s.kind === SymbolKind.Function);
    expect(httpSymbol).toBeDefined();
    expect(httpSymbol!.name).toContain('GET');
    expect(httpSymbol!.name).toContain('/api/users');
  });

  it('reports computed as Property symbols', () => {
    const content = '<span computed="total" expr="price * qty"></span>';
    const symbols = getSymbols(content);
    const computedSymbol = symbols.find(s => s.kind === SymbolKind.Property);
    expect(computedSymbol).toBeDefined();
    expect(computedSymbol!.name).toContain('total');
  });

  it('reports watch as Event symbols', () => {
    const content = '<div watch="query" on:change="fetch()"></div>';
    const symbols = getSymbols(content);
    const watchSymbol = symbols.find(s => s.kind === SymbolKind.Event);
    expect(watchSymbol).toBeDefined();
    expect(watchSymbol!.name).toContain('query');
  });

  it('returns empty array for document with no NoJS directives', () => {
    const content = '<div class="container"><p>Hello</p></div>';
    const symbols = getSymbols(content);
    expect(symbols).toHaveLength(0);
  });

  it('reports multiple symbols from a complex document', () => {
    const content = `
      <div state="{ count: 0 }">
        <input ref="counter" />
        <div store="app" value="{}"></div>
        <template id="card"><p>Card</p></template>
        <div get="/api/data" as="data"></div>
      </div>
    `;
    const symbols = getSymbols(content);
    expect(symbols.length).toBeGreaterThanOrEqual(5);
    expect(symbols.some(s => s.kind === SymbolKind.Variable)).toBe(true);
    expect(symbols.some(s => s.kind === SymbolKind.Field)).toBe(true);
    expect(symbols.some(s => s.kind === SymbolKind.Module)).toBe(true);
    expect(symbols.some(s => s.kind === SymbolKind.Class)).toBe(true);
    expect(symbols.some(s => s.kind === SymbolKind.Function)).toBe(true);
  });
});
