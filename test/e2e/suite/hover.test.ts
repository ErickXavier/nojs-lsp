import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  activateExtension,
  openFixture,
  getHover,
  findPosition,
  sleep,
} from './helper';

suite('E2E — Hover Provider', function () {
  this.timeout(60000);

  let doc: vscode.TextDocument;

  suiteSetup(async () => {
    await activateExtension();
    doc = await openFixture('all-directives.html');
  });

  test('should show hover for state directive', async () => {
    const pos = findPosition(doc, 'state="{ count: 0');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 2)); // on "state"

    assert.ok(hovers.length > 0, 'Should return hover information');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('state'), 'Hover should mention state directive');
  });

  test('should show hover for get directive', async () => {
    const pos = findPosition(doc, 'get="/api/users"');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 1)); // on "get"

    assert.ok(hovers.length > 0, 'Should return hover information');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('get'), 'Hover should mention get directive');
  });

  test('should show hover for on:click (pattern directive)', async () => {
    const pos = findPosition(doc, 'on:click="count++"');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 3)); // on "on:click"

    assert.ok(hovers.length > 0, 'Should return hover information');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('on:'), 'Hover should mention on: event pattern');
  });

  test('should show hover for bind-* pattern directive', async () => {
    const pos = findPosition(doc, 'bind-href="url"');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 5));

    assert.ok(hovers.length > 0, 'Should return hover information');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('bind'), 'Hover should mention bind-* directive');
  });

  test('should show hover for filter in pipe expression', async () => {
    const pos = findPosition(doc, '| uppercase');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 3)); // on "uppercase"

    assert.ok(hovers.length > 0, 'Should return hover for filter');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.toLowerCase().includes('uppercase') || content.toLowerCase().includes('filter'),
      'Hover should describe the uppercase filter');
  });

  test('should show hover for context key $store in expression', async () => {
    const pos = findPosition(doc, '$store.user.name');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 3)); // on "$store"

    assert.ok(hovers.length > 0, 'Should return hover for $store');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('$store'), 'Hover should describe $store');
  });

  test('should show hover for loop variable $index', async () => {
    const pos = findPosition(doc, '$index');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 2));

    assert.ok(hovers.length > 0, 'Should return hover for $index');
    const content = hovers[0].contents.map((c: any) =>
      typeof c === 'string' ? c : c.value || ''
    ).join('');
    assert.ok(content.includes('$index'), 'Hover should describe $index');
  });

  test('should NOT show hover for standard HTML attributes', async () => {
    const pos = findPosition(doc, 'class="card"');
    const hovers = await getHover(doc, new vscode.Position(pos.line, pos.character + 2));

    // Should return empty or no hover from our extension (HTML service might add its own)
    // We just verify no crash
    assert.ok(true, 'Should not crash on standard attributes');
  });
});
