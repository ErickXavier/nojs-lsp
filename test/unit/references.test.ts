import { TextDocument } from 'vscode-languageserver-textdocument';
import { Location } from 'vscode-languageserver/node';
import { onReferences } from '../../server/src/providers/references';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getReferences(content: string, offset: number, includeDeclaration = true): Location[] | null {
  const mock = createMockDocuments(content);
  const handler = onReferences(mock as any);
  const position = mock.doc.positionAt(offset);
  return handler({
    textDocument: { uri: mock.doc.uri },
    position,
    context: { includeDeclaration },
  });
}

describe('ReferencesProvider', () => {
  it('finds all usages of a template ID from declaration', () => {
    const content = '<template id="card"><p>Card</p></template><div use="card"></div><div each="items" template="card"></div>';
    // Cursor on "card" in id="card"
    const idIdx = content.indexOf('"card"') + 1;
    const result = getReferences(content, idIdx);
    expect(result).not.toBeNull();
    // Should find: id declaration + use + template attribute = 3 references
    expect(result!.length).toBeGreaterThanOrEqual(2);
  });

  it('finds template ID references from use attribute', () => {
    const content = '<template id="card"><p>Card</p></template><div use="card"></div>';
    const useIdx = content.indexOf('"card"', content.indexOf('use=')) + 1;
    const result = getReferences(content, useIdx);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });

  it('finds ref references from ref="name" declaration', () => {
    const content = '<input ref="myInput" /><div bind="$refs.myInput.value"></div><button on:click="$refs.myInput.focus()"></button>';
    // Cursor on "ref" attribute
    const refIdx = content.indexOf('ref=');
    const result = getReferences(content, refIdx);
    expect(result).not.toBeNull();
    // Should find: ref declaration + 2 $refs.myInput usages = 3
    expect(result!.length).toBeGreaterThanOrEqual(2);
  });

  it('finds store references from store="name" declaration', () => {
    const content = '<div store="cart" value="{ items: [] }"></div><p bind="$store.cart.items"></p>';
    const storeIdx = content.indexOf('store=');
    const result = getReferences(content, storeIdx);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });

  it('finds store references from $store.name in expression', () => {
    const content = '<div store="user" value="{}"></div><p bind="$store.user.name"></p><span bind="$store.user.email"></span>';
    const storeRefIdx = content.indexOf('$store.user', content.indexOf('bind='));
    const result = getReferences(content, storeRefIdx + 7); // on "user"
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null when cursor is on unrelated attribute', () => {
    const content = '<div state="{ count: 0 }"></div>';
    const result = getReferences(content, 6);
    expect(result).toBeNull();
  });

  it('excludes declaration when includeDeclaration is false', () => {
    const content = '<template id="tpl"><p>Hi</p></template><div use="tpl"></div>';
    const idIdx = content.indexOf('"tpl"') + 1;
    const withDecl = getReferences(content, idIdx, true);
    const withoutDecl = getReferences(content, idIdx, false);
    expect(withDecl).not.toBeNull();
    expect(withoutDecl).not.toBeNull();
    // Without declaration should have one less
    expect(withoutDecl!.length).toBeLessThan(withDecl!.length);
  });
});
