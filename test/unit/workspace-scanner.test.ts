import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  scanI18nKeys,
  scanRoutes,
  scanStoreProperties,
  scanCustomDirectives,
  scanCustomDirectivesInDocuments,
  scanTemplateVars,
  setWorkspaceRoots,
  getWorkspaceData,
  invalidateCache,
} from '../../server/src/workspace-scanner';

// Helper to create temp directories with files
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nojs-test-'));
}

function writeFile(dir: string, relativePath: string, content: string): void {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Mock TextDocuments
function createMockDocuments(docs: { uri: string; content: string }[]) {
  const textDocs = docs.map(d => TextDocument.create(d.uri, 'html', 1, d.content));
  return {
    get: (uri: string) => textDocs.find(d => d.uri === uri),
    all: () => textDocs,
  };
}

describe('WorkspaceScanner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
    invalidateCache();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('scanI18nKeys', () => {
    it('scans flat locale JSON files', () => {
      writeFile(tmpDir, 'locales/en.json', JSON.stringify({
        greeting: 'Hello',
        farewell: 'Goodbye',
      }));
      writeFile(tmpDir, 'locales/pt.json', JSON.stringify({
        greeting: 'Olá',
        farewell: 'Tchau',
      }));

      const keys = scanI18nKeys(tmpDir);
      expect(keys.length).toBe(4);
      const enGreeting = keys.find(k => k.key === 'greeting' && k.locale === 'en');
      expect(enGreeting).toBeDefined();
      expect(enGreeting!.value).toBe('Hello');
      const ptGreeting = keys.find(k => k.key === 'greeting' && k.locale === 'pt');
      expect(ptGreeting).toBeDefined();
      expect(ptGreeting!.value).toBe('Olá');
    });

    it('scans namespaced locale JSON files', () => {
      writeFile(tmpDir, 'locales/en/common.json', JSON.stringify({
        save: 'Save',
        cancel: 'Cancel',
      }));
      writeFile(tmpDir, 'locales/en/nav.json', JSON.stringify({
        home: 'Home',
      }));

      const keys = scanI18nKeys(tmpDir);
      expect(keys.length).toBe(3);
      expect(keys.find(k => k.key === 'common.save')).toBeDefined();
      expect(keys.find(k => k.key === 'nav.home')).toBeDefined();
    });

    it('flattens nested keys with dot notation', () => {
      writeFile(tmpDir, 'locales/en.json', JSON.stringify({
        nav: {
          home: 'Home',
          about: 'About',
        },
        footer: {
          links: {
            privacy: 'Privacy Policy',
          },
        },
      }));

      const keys = scanI18nKeys(tmpDir);
      expect(keys.find(k => k.key === 'nav.home')).toBeDefined();
      expect(keys.find(k => k.key === 'nav.about')).toBeDefined();
      expect(keys.find(k => k.key === 'footer.links.privacy')).toBeDefined();
    });

    it('returns empty for missing locales directory', () => {
      const keys = scanI18nKeys(tmpDir);
      expect(keys).toEqual([]);
    });
  });

  describe('scanRoutes', () => {
    it('scans pages directory for routes', () => {
      writeFile(tmpDir, 'pages/index.html', '<h1>Home</h1>');
      writeFile(tmpDir, 'pages/about.html', '<h1>About</h1>');
      writeFile(tmpDir, 'pages/contact.html', '<h1>Contact</h1>');

      const routes = scanRoutes(tmpDir);
      expect(routes.length).toBe(3);
      expect(routes.find(r => r.path === '/')).toBeDefined();
      expect(routes.find(r => r.path === '/about')).toBeDefined();
      expect(routes.find(r => r.path === '/contact')).toBeDefined();
    });

    it('handles nested directories', () => {
      writeFile(tmpDir, 'pages/index.html', '<h1>Home</h1>');
      writeFile(tmpDir, 'pages/blog/index.html', '<h1>Blog</h1>');
      writeFile(tmpDir, 'pages/blog/post.html', '<h1>Post</h1>');

      const routes = scanRoutes(tmpDir);
      expect(routes.find(r => r.path === '/')).toBeDefined();
      expect(routes.find(r => r.path === '/blog')).toBeDefined();
      expect(routes.find(r => r.path === '/blog/post')).toBeDefined();
    });

    it('returns empty for missing pages directory', () => {
      const routes = scanRoutes(tmpDir);
      expect(routes).toEqual([]);
    });
  });

  describe('scanStoreProperties', () => {
    it('extracts store names and properties from documents', () => {
      const docs = createMockDocuments([{
        uri: 'file:///test.html',
        content: '<div store="user" value="{ name: \'Erick\', role: \'admin\' }"></div>',
      }]);

      const stores = scanStoreProperties(docs as any);
      expect(stores.length).toBe(1);
      expect(stores[0].storeName).toBe('user');
      expect(stores[0].properties).toContain('name');
      expect(stores[0].properties).toContain('role');
    });

    it('handles reversed attribute order', () => {
      const docs = createMockDocuments([{
        uri: 'file:///test.html',
        content: '<div value="{ count: 0 }" store="counter"></div>',
      }]);

      const stores = scanStoreProperties(docs as any);
      expect(stores.length).toBe(1);
      expect(stores[0].storeName).toBe('counter');
      expect(stores[0].properties).toContain('count');
    });

    it('deduplicates stores across documents', () => {
      const docs = createMockDocuments([
        { uri: 'file:///a.html', content: '<div store="app" value="{ theme: \'dark\' }"></div>' },
        { uri: 'file:///b.html', content: '<div store="app" value="{ theme: \'light\' }"></div>' },
      ]);

      const stores = scanStoreProperties(docs as any);
      expect(stores.length).toBe(1);
    });

    it('extracts stores from NoJS.config({ stores: { ... } })', () => {
      const docs = createMockDocuments([{
        uri: 'file:///test.html',
        content: '<script>NoJS.config({ stores: { auth: { user: null, token: "" }, cart: { items: [], total: 0 } } });</script>',
      }]);

      const stores = scanStoreProperties(docs as any);
      expect(stores.length).toBe(2);
      expect(stores.find(s => s.storeName === 'auth')).toBeDefined();
      expect(stores.find(s => s.storeName === 'auth')!.properties).toContain('user');
      expect(stores.find(s => s.storeName === 'auth')!.properties).toContain('token');
      expect(stores.find(s => s.storeName === 'cart')).toBeDefined();
      expect(stores.find(s => s.storeName === 'cart')!.properties).toContain('items');
      expect(stores.find(s => s.storeName === 'cart')!.properties).toContain('total');
    });

    it('does not duplicate config stores already declared via store attribute', () => {
      const docs = createMockDocuments([{
        uri: 'file:///test.html',
        content: '<div store="auth" value="{ user: null }"></div><script>NoJS.config({ stores: { auth: { token: "" } } });</script>',
      }]);

      const stores = scanStoreProperties(docs as any);
      expect(stores.length).toBe(1);
      expect(stores[0].storeName).toBe('auth');
    });
  });

  describe('scanCustomDirectives', () => {
    it('finds NoJS.directive() calls in JS files', () => {
      writeFile(tmpDir, 'app.js', `
        NoJS.directive('tooltip', {
          priority: 10,
          init(el, name, value) {}
        });
        NoJS.directive("highlight", {
          init(el) {}
        });
      `);

      const directives = scanCustomDirectives(tmpDir);
      expect(directives.length).toBe(2);
      expect(directives.find(d => d.name === 'tooltip')).toBeDefined();
      expect(directives.find(d => d.name === 'highlight')).toBeDefined();
    });

    it('skips node_modules', () => {
      writeFile(tmpDir, 'node_modules/lib/index.js', `NoJS.directive('internal', {});`);
      writeFile(tmpDir, 'app.js', `NoJS.directive('custom', {});`);

      const directives = scanCustomDirectives(tmpDir);
      expect(directives.length).toBe(1);
      expect(directives[0].name).toBe('custom');
    });
  });

  describe('scanCustomDirectivesInDocuments', () => {
    it('finds directives in inline script blocks', () => {
      const docs = createMockDocuments([{
        uri: 'file:///test.html',
        content: `<script>NoJS.directive('autofocus', { init(el) { el.focus(); } });</script>`,
      }]);

      const directives = scanCustomDirectivesInDocuments(docs as any);
      expect(directives.length).toBe(1);
      expect(directives[0].name).toBe('autofocus');
    });
  });

  describe('scanTemplateVars', () => {
    it('extracts var from template declarations', () => {
      const text = '<template id="card" var="item"><div></div></template>';
      const vars = scanTemplateVars(text);
      expect(vars.length).toBe(1);
      expect(vars[0].templateId).toBe('card');
      expect(vars[0].varNames).toContain('item');
    });

    it('extracts var-* from use elements referencing a template', () => {
      const text = `
        <template id="userCard" var="user"><div></div></template>
        <div use="userCard" var-name="Erick" var-role="admin"></div>
      `;
      const vars = scanTemplateVars(text);
      expect(vars.length).toBe(1);
      expect(vars[0].templateId).toBe('userCard');
      expect(vars[0].varNames).toContain('user');
      expect(vars[0].varNames).toContain('name');
      expect(vars[0].varNames).toContain('role');
    });

    it('returns empty for templates without vars', () => {
      const text = '<template id="empty"><p>Hello</p></template>';
      const vars = scanTemplateVars(text);
      expect(vars.length).toBe(0);
    });
  });

  describe('getWorkspaceData (cache)', () => {
    it('returns cached data on subsequent calls', () => {
      writeFile(tmpDir, 'locales/en.json', JSON.stringify({ hello: 'Hello' }));
      setWorkspaceRoots([tmpDir]);

      const docs = createMockDocuments([]);
      const data1 = getWorkspaceData(docs as any);
      const data2 = getWorkspaceData(docs as any);
      expect(data1).toBe(data2); // same object reference = cached
    });

    it('invalidates cache when requested', () => {
      writeFile(tmpDir, 'locales/en.json', JSON.stringify({ hello: 'Hello' }));
      setWorkspaceRoots([tmpDir]);

      const docs = createMockDocuments([]);
      const data1 = getWorkspaceData(docs as any);
      invalidateCache();
      const data2 = getWorkspaceData(docs as any);
      expect(data1).not.toBe(data2); // different object = re-scanned
      expect(data2.i18nKeys.length).toBe(1);
    });
  });
});
