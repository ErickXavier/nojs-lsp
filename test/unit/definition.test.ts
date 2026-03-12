import { TextDocument } from 'vscode-languageserver-textdocument';
import { Location } from 'vscode-languageserver/node';
import { onDefinition } from '../../server/src/providers/definition';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getDefinition(content: string, offset: number): Location | null {
  const mock = createMockDocuments(content);
  const handler = onDefinition(mock as any);
  const position = mock.doc.positionAt(offset);
  return handler({
    textDocument: { uri: mock.doc.uri },
    position,
  });
}

describe('DefinitionProvider', () => {
  it('navigates from use="id" to <template id="id">', () => {
    const content = '<div use="my-tpl"></div><template id="my-tpl"><p>Hello</p></template>';
    // Cursor is on "my-tpl" in use="my-tpl"
    const useIdx = content.indexOf('my-tpl');
    const result = getDefinition(content, useIdx);
    expect(result).not.toBeNull();
    if (result) {
      const templateStart = content.indexOf('<template');
      const templateEnd = content.indexOf('</template>') + '</template>'.length;
      expect(result.uri).toBe('file:///test.html');
      // The range should cover the template element
      const startOffset = result.range.start.line === 0
        ? result.range.start.character
        : -1;
      expect(startOffset).toBe(templateStart);
    }
  });

  it('navigates from then="id" to template', () => {
    const content = '<div if="show" then="detail-tpl"></div><template id="detail-tpl"><p>Details</p></template>';
    const thenIdx = content.indexOf('detail-tpl');
    const result = getDefinition(content, thenIdx);
    expect(result).not.toBeNull();
  });

  it('navigates from $refs.name to ref="name"', () => {
    const content = '<input ref="myInput" /><div bind="$refs.myInput.value"></div>';
    // Cursor on "myInput" after "$refs."
    const refsIdx = content.indexOf('$refs.myInput', content.indexOf('bind='));
    const result = getDefinition(content, refsIdx + 6); // on "myInput"
    expect(result).not.toBeNull();
    if (result) {
      const refElement = content.indexOf('<input');
      const startOffset = result.range.start.character;
      expect(startOffset).toBe(refElement);
    }
  });

  it('navigates from $store.name to store="name"', () => {
    const content = '<div store="cart" value="{ items: [] }"></div><p bind="$store.cart.items"></p>';
    // Cursor on "cart" after "$store."
    const storeIdx = content.indexOf('$store.cart');
    const result = getDefinition(content, storeIdx + 7); // on "cart"
    expect(result).not.toBeNull();
    if (result) {
      const storeElement = content.indexOf('<div store');
      const startOffset = result.range.start.character;
      expect(startOffset).toBe(storeElement);
    }
  });

  it('returns null when template is not found', () => {
    const content = '<div use="nonexistent"></div>';
    const useIdx = content.indexOf('nonexistent');
    const result = getDefinition(content, useIdx);
    expect(result).toBeNull();
  });

  it('returns null when cursor is on non-definition attribute', () => {
    const content = '<div state="{ count: 0 }"></div>';
    const result = getDefinition(content, 6); // on "state"
    expect(result).toBeNull();
  });

  it('navigates from loading="id" to template', () => {
    const content = '<div get="/api" as="data" loading="spin-tpl"></div><template id="spin-tpl"><p>Loading...</p></template>';
    const loadingIdx = content.indexOf('spin-tpl');
    const result = getDefinition(content, loadingIdx);
    expect(result).not.toBeNull();
  });
});
