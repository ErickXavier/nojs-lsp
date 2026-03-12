import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  parseHtmlDocument,
  getAllElements,
  getElementAtOffset,
  getCursorContext,
  hasNoJsDirectives,
  findTemplates,
  findRefs,
  getPreviousSibling,
} from '../../server/src/html-parser';

function createDocument(content: string): TextDocument {
  return TextDocument.create('file:///test.html', 'html', 1, content);
}

describe('HtmlParser', () => {
  describe('parseHtmlDocument', () => {
    it('parses a simple HTML document', () => {
      const doc = createDocument('<div state="{ count: 0 }"></div>');
      const htmlDoc = parseHtmlDocument(doc);
      expect(htmlDoc.roots.length).toBeGreaterThan(0);
    });
  });

  describe('getAllElements', () => {
    it('extracts elements with attributes', () => {
      const content = '<div state="{ count: 0 }"><span text="count"></span></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const elements = getAllElements(htmlDoc, content);
      expect(elements.length).toBe(2);
      expect(elements[0].tag).toBe('div');
      expect(elements[1].tag).toBe('span');
    });

    it('extracts attribute names and values', () => {
      const content = '<div state="{ count: 0 }" if="count > 0"></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const elements = getAllElements(htmlDoc, content);
      expect(elements[0].attributes.length).toBe(2);
      const stateAttr = elements[0].attributes.find(a => a.name === 'state');
      expect(stateAttr).toBeDefined();
    });
  });

  describe('getElementAtOffset', () => {
    it('returns element at offset', () => {
      const content = '<div state="test"><span text="hi"></span></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      // Offset inside the <div> opening tag
      const element = getElementAtOffset(htmlDoc, 5, content);
      expect(element).toBeDefined();
      expect(element!.tag).toBe('div');
    });

    it('returns inner element for nested offset', () => {
      const content = '<div><span text="hi"></span></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      // Offset inside <span> opening tag
      const element = getElementAtOffset(htmlDoc, 10, content);
      expect(element).toBeDefined();
      expect(element!.tag).toBe('span');
    });
  });

  describe('getCursorContext', () => {
    it('detects attribute name context', () => {
      const content = '<div sta></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const position = doc.positionAt(8); // after "sta"
      const ctx = getCursorContext(doc, position, htmlDoc);
      expect(ctx.type).toBe('attributeName');
      if (ctx.type === 'attributeName') {
        expect(ctx.partial).toMatch(/^sta/);
      }
    });

    it('detects attribute value context', () => {
      const content = '<div state="cou"></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const position = doc.positionAt(15); // inside the value
      const ctx = getCursorContext(doc, position, htmlDoc);
      expect(ctx.type).toBe('attributeValue');
      if (ctx.type === 'attributeValue') {
        expect(ctx.attrName).toBe('state');
      }
    });

    it('returns none outside tags', () => {
      const content = '<div></div> some text here';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const position = doc.positionAt(20); // in text content
      const ctx = getCursorContext(doc, position, htmlDoc);
      expect(ctx.type).toBe('none');
    });
  });

  describe('hasNoJsDirectives', () => {
    it('detects state directive', () => {
      expect(hasNoJsDirectives('<div state="{ count: 0 }"></div>')).toBe(true);
    });

    it('detects on: pattern', () => {
      expect(hasNoJsDirectives('<button on:click="count++">Click</button>')).toBe(true);
    });

    it('detects bind- pattern', () => {
      expect(hasNoJsDirectives('<a bind-href="url">Link</a>')).toBe(true);
    });

    it('detects NoJS script tag', () => {
      expect(hasNoJsDirectives('<script src="https://cdn.example.com/no-js.js"></script>')).toBe(true);
    });

    it('returns false for plain HTML', () => {
      expect(hasNoJsDirectives('<div class="container"><p>Hello</p></div>')).toBe(false);
    });
  });

  describe('findTemplates', () => {
    it('finds template elements with IDs', () => {
      const content = '<template id="card"><div>card</div></template><template id="list"><ul></ul></template>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const templates = findTemplates(htmlDoc, content);
      expect(templates.size).toBe(2);
      expect(templates.has('card')).toBe(true);
      expect(templates.has('list')).toBe(true);
    });
  });

  describe('findRefs', () => {
    it('finds ref attributes', () => {
      const content = '<input ref="nameInput" /><div ref="container"></div>';
      const doc = createDocument(content);
      const htmlDoc = parseHtmlDocument(doc);
      const refs = findRefs(htmlDoc, content);
      expect(refs.size).toBe(2);
      expect(refs.has('nameInput')).toBe(true);
      expect(refs.has('container')).toBe(true);
    });
  });
});
