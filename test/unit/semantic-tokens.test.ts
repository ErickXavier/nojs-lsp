import { TextDocument } from 'vscode-languageserver-textdocument';
import { SemanticTokens } from 'vscode-languageserver/node';
import { onSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } from '../../server/src/providers/semantic-tokens';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getTokens(content: string): SemanticTokens {
  const mock = createMockDocuments(content);
  const handler = onSemanticTokens(mock as any);
  return handler({
    textDocument: { uri: mock.doc.uri },
  });
}

/**
 * Decode semantic tokens data into readable objects.
 * Semantic tokens are encoded as [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
 */
function decodeTokens(data: number[]) {
  const tokens: Array<{
    line: number;
    character: number;
    length: number;
    type: string;
    modifiers: string[];
  }> = [];

  let currentLine = 0;
  let currentChar = 0;

  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaChar = data[i + 1];
    const length = data[i + 2];
    const tokenType = data[i + 3];
    const tokenModifiers = data[i + 4];

    currentLine += deltaLine;
    if (deltaLine > 0) currentChar = deltaChar;
    else currentChar += deltaChar;

    const modifiers: string[] = [];
    for (let j = 0; j < TOKEN_MODIFIERS.length; j++) {
      if (tokenModifiers & (1 << j)) {
        modifiers.push(TOKEN_MODIFIERS[j]);
      }
    }

    tokens.push({
      line: currentLine,
      character: currentChar,
      length,
      type: TOKEN_TYPES[tokenType] || 'unknown',
      modifiers,
    });
  }

  return tokens;
}

describe('SemanticTokensProvider', () => {
  it('marks directive names as keyword', () => {
    const content = '<div state="{ count: 0 }"></div>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const stateToken = tokens.find(t => t.type === 'keyword' && t.length === 5);
    expect(stateToken).toBeDefined();
    expect(stateToken!.modifiers).toContain('declaration');
  });

  it('marks dynamic prefix bind- as decorator', () => {
    const content = '<a bind-href="url"></a>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const decoratorToken = tokens.find(t => t.type === 'decorator');
    expect(decoratorToken).toBeDefined();
    expect(decoratorToken!.length).toBe(5); // "bind-"
  });

  it('marks on: prefix as decorator', () => {
    const content = '<button on:click="handleClick()"></button>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const decoratorToken = tokens.find(t => t.type === 'decorator');
    expect(decoratorToken).toBeDefined();
    expect(decoratorToken!.length).toBe(3); // "on:"
  });

  it('marks pipe operator as operator', () => {
    const content = '<p bind="name | uppercase"></p>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const operatorToken = tokens.find(t => t.type === 'operator');
    expect(operatorToken).toBeDefined();
    expect(operatorToken!.length).toBe(1);
  });

  it('marks filter names as function', () => {
    const content = '<p bind="name | uppercase"></p>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const functionToken = tokens.find(t => t.type === 'function');
    expect(functionToken).toBeDefined();
  });

  it('marks $store as variable with readonly modifier', () => {
    const content = '<p bind="$store.user.name"></p>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const varToken = tokens.find(t => t.type === 'variable');
    expect(varToken).toBeDefined();
    expect(varToken!.modifiers).toContain('readonly');
  });

  it('marks context vars ($index, $count) as parameter', () => {
    const content = '<li each="items" bind="$index"></li>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const paramToken = tokens.find(t => t.type === 'parameter');
    expect(paramToken).toBeDefined();
    expect(paramToken!.modifiers).toContain('defaultLibrary');
  });

  it('handles document with no NoJS content', () => {
    const content = '<div class="container"><p>Hello</p></div>';
    const result = getTokens(content);
    expect(result.data).toHaveLength(0);
  });

  it('marks multiple tokens in chained filters', () => {
    const content = '<p bind="name | uppercase | truncate:20"></p>';
    const result = getTokens(content);
    const tokens = decodeTokens(result.data);
    const operators = tokens.filter(t => t.type === 'operator');
    const functions = tokens.filter(t => t.type === 'function');
    expect(operators.length).toBe(2);
    expect(functions.length).toBe(2);
  });
});
