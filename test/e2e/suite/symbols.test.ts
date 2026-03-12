import * as assert from 'assert';
import { activateExtension, openFixture, getDocumentSymbols } from './helper';
import * as vscode from 'vscode';

suite('E2E: Document Symbols', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('shows state declarations in document outline', async () => {
    const doc = await openFixture('all-directives.html');
    const symbols = await getDocumentSymbols(doc);
    assert.ok(symbols.length > 0, 'Should find document symbols');
    const stateSymbol = symbols.find(s => s.name.includes('state'));
    assert.ok(stateSymbol, 'Should find a state symbol');
    assert.strictEqual(stateSymbol!.kind, vscode.SymbolKind.Variable);
  });

  test('shows store declarations in document outline', async () => {
    const doc = await openFixture('all-directives.html');
    const symbols = await getDocumentSymbols(doc);
    const storeSymbol = symbols.find(s => s.name.includes('store'));
    assert.ok(storeSymbol, 'Should find a store symbol');
    assert.strictEqual(storeSymbol!.kind, vscode.SymbolKind.Module);
  });

  test('shows ref declarations in document outline', async () => {
    const doc = await openFixture('all-directives.html');
    const symbols = await getDocumentSymbols(doc);
    const refSymbol = symbols.find(s => s.name.includes('ref'));
    assert.ok(refSymbol, 'Should find a ref symbol');
    assert.strictEqual(refSymbol!.kind, vscode.SymbolKind.Field);
  });

  test('shows template definitions in document outline', async () => {
    const doc = await openFixture('all-directives.html');
    const symbols = await getDocumentSymbols(doc);
    const tplSymbol = symbols.find(s => s.name.includes('template'));
    assert.ok(tplSymbol, 'Should find a template symbol');
    assert.strictEqual(tplSymbol!.kind, vscode.SymbolKind.Class);
  });

  test('shows HTTP endpoints in document outline', async () => {
    const doc = await openFixture('all-directives.html');
    const symbols = await getDocumentSymbols(doc);
    const httpSymbol = symbols.find(s => s.name.includes('GET') || s.name.includes('POST'));
    assert.ok(httpSymbol, 'Should find an HTTP endpoint symbol');
    assert.strictEqual(httpSymbol!.kind, vscode.SymbolKind.Function);
  });
});
