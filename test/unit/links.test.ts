import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentLink } from 'vscode-languageserver/node';
import { onDocumentLinks } from '../../server/src/providers/links';

function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    doc,
  };
}

function getLinks(content: string): DocumentLink[] {
  const mock = createMockDocuments(content);
  const handler = onDocumentLinks(mock as any);
  return handler({
    textDocument: { uri: mock.doc.uri },
  });
}

describe('DocumentLinksProvider', () => {
  it('creates links for HTTP directive URLs with full URLs', () => {
    const content = '<div get="https://api.example.com/users" as="users"></div>';
    const links = getLinks(content);
    expect(links.length).toBeGreaterThanOrEqual(1);
    const apiLink = links.find(l => l.target === 'https://api.example.com/users');
    expect(apiLink).toBeDefined();
  });

  it('creates links for API paths', () => {
    const content = '<div get="/api/users" as="users"></div>';
    const links = getLinks(content);
    expect(links.length).toBeGreaterThanOrEqual(1);
    // API paths don't have a resolvable target
    const apiLink = links[0];
    expect(apiLink.tooltip).toContain('GET');
  });

  it('creates links for post directive URLs', () => {
    const content = '<form post="/api/users" as="result"></form>';
    const links = getLinks(content);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].tooltip).toContain('POST');
  });

  it('creates links for template src attributes', () => {
    const content = '<template src="./templates/card.html"></template>';
    const links = getLinks(content);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].tooltip).toContain('./templates/card.html');
  });

  it('creates links for redirect attributes', () => {
    const content = '<div get="/api/data" as="d" redirect="/success"></div>';
    const links = getLinks(content);
    const redirectLink = links.find(l => l.tooltip?.includes('Redirect'));
    expect(redirectLink).toBeDefined();
  });

  it('does not create links for expression values', () => {
    const content = '<div bind="someExpression"></div>';
    const links = getLinks(content);
    expect(links).toHaveLength(0);
  });

  it('handles call directive URLs', () => {
    const content = '<button call="/api/action"></button>';
    const links = getLinks(content);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].tooltip).toContain('CALL');
  });
});
