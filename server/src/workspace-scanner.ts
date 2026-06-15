/**
 * Workspace Scanner
 * Scans workspace files for:
 * - i18n locale JSON files → extract translation keys
 * - pages/ directory → extract route paths
 * - store declarations in HTML → extract store property paths
 * - NoJS.directive() calls in JS → extract custom directive names
 */
import { Connection } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CancellationToken } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import * as fs from 'fs';
import * as path from 'path';

// ─── i18n Key Scanning ───

export interface I18nKeyInfo {
  key: string;
  value: string;
  locale: string;
  filePath: string;
}

/**
 * Recursively flatten a nested JSON object into dot-notation keys.
 * e.g., { nav: { home: "Home" } } → [{ key: "nav.home", value: "Home" }]
 */
function flattenKeys(obj: Record<string, any>, prefix = ''): { key: string; value: string }[] {
  const results: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      results.push(...flattenKeys(v, fullKey));
    } else {
      results.push({ key: fullKey, value: String(v) });
    }
  }
  return results;
}

/**
 * Scan workspace for locale JSON files and extract translation keys.
 * Looks for patterns like:
 *   locales/{locale}.json  (flat mode)
 *   locales/{locale}/*.json  (namespace mode)
 */
export function scanI18nKeys(workspaceRoot: string, token?: CancellationToken): I18nKeyInfo[] {
  const results: I18nKeyInfo[] = [];
  const localesDirs = findDirectories(workspaceRoot, 'locales');

  for (const localesDir of localesDirs) {
    if (token?.isCancellationRequested) return results;
    const entries = safeReaddir(localesDir);
    for (const entry of entries) {
      if (token?.isCancellationRequested) return results;
      const fullPath = path.join(localesDir, entry);
      if (!isWithinWorkspace(fullPath)) continue;
      const stat = safeStat(fullPath);
      if (!stat) continue;

      if (stat.isFile() && entry.endsWith('.json')) {
        // Flat mode: locales/en.json
        const locale = entry.replace('.json', '');
        const keys = parseLocaleFile(fullPath, locale);
        results.push(...keys);
      } else if (stat.isDirectory()) {
        // Namespace mode: locales/en/*.json
        const locale = entry;
        const nsFiles = safeReaddir(fullPath).filter(f => f.endsWith('.json'));
        for (const nsFile of nsFiles) {
          if (token?.isCancellationRequested) return results;
          const nsPath = path.join(fullPath, nsFile);
          if (!isWithinWorkspace(nsPath)) continue;
          const ns = nsFile.replace('.json', '');
          const keys = parseLocaleFile(nsPath, locale, ns);
          results.push(...keys);
        }
      }
    }
  }

  return results;
}

function parseLocaleFile(filePath: string, locale: string, namespace?: string): I18nKeyInfo[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    const flat = flattenKeys(json);
    return flat.map(({ key, value }) => ({
      key: namespace ? `${namespace}.${key}` : key,
      value,
      locale,
      filePath,
    }));
  } catch {
    return [];
  }
}

// ─── Route Path Scanning ───

export interface RouteInfo {
  path: string;
  filePath: string;
  fileName: string;
}

/**
 * Scan a pages/ directory for file-based routes.
 * Convention: pages/about.html → /about, pages/index.html → /
 */
export function scanRoutes(workspaceRoot: string, pagesDir = 'pages', ext = '.html'): RouteInfo[] {
  const results: RouteInfo[] = [];
  const fullPagesDir = path.join(workspaceRoot, pagesDir);

  if (!safeExists(fullPagesDir)) {
    // Also check for common alternative extensions
    const altExts = ['.html', '.tpl', '.htm'];
    for (const altExt of altExts) {
      scanRoutesRecursive(fullPagesDir, fullPagesDir, altExt, results);
    }
    return results;
  }

  scanRoutesRecursive(fullPagesDir, fullPagesDir, ext, results);

  // Try other extensions too
  if (results.length === 0) {
    for (const altExt of ['.tpl', '.htm']) {
      if (altExt !== ext) {
        scanRoutesRecursive(fullPagesDir, fullPagesDir, altExt, results);
      }
    }
  }

  return results;
}

function scanRoutesRecursive(baseDir: string, dir: string, ext: string, results: RouteInfo[]): void {
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (!isWithinWorkspace(fullPath)) continue;
    const stat = safeStat(fullPath);
    if (!stat) continue;

    if (stat.isFile() && entry.endsWith(ext)) {
      const relativePath = path.relative(baseDir, fullPath);
      const routeName = relativePath.replace(new RegExp(`\\${ext}$`), '').replace(/\\/g, '/');
      let routePath: string;
      if (routeName === 'index') {
        routePath = '/';
      } else if (routeName.endsWith('/index')) {
        routePath = '/' + routeName.slice(0, -6);
      } else {
        routePath = `/${routeName}`;
      }
      results.push({
        path: routePath,
        filePath: fullPath,
        fileName: entry,
      });
    } else if (stat.isDirectory() && !entry.startsWith('.')) {
      scanRoutesRecursive(baseDir, fullPath, ext, results);
    }
  }
}

// ─── Store Property Scanning ───

export interface StorePropertyInfo {
  storeName: string;
  properties: string[];
}

/**
 * Parse store declarations from open documents to extract property paths.
 * Looks for store="name" value="{ prop1, prop2 }" patterns.
 */
export function scanStoreProperties(documents: TextDocuments<TextDocument>): StorePropertyInfo[] {
  const stores: StorePropertyInfo[] = [];
  const seen = new Set<string>();

  for (const doc of documents.all()) {
    const text = doc.getText();
    // Match store="name" + value/state attributes
    const storeRegex = /store="([^"]+)"[^>]*(?:value|state)="(\{[^"]*\})"/g;
    let match;
    while ((match = storeRegex.exec(text)) !== null) {
      const storeName = match[1];
      if (seen.has(storeName)) continue;
      seen.add(storeName);

      const valueExpr = match[2];
      const props = extractObjectKeys(valueExpr);
      stores.push({ storeName, properties: props });
    }

    // Also match state="{ ... }" store="name" (reversed order)
    const reverseRegex = /(?:value|state)="(\{[^"]*\})"[^>]*store="([^"]+)"/g;
    while ((match = reverseRegex.exec(text)) !== null) {
      const storeName = match[2];
      if (seen.has(storeName)) continue;
      seen.add(storeName);

      const valueExpr = match[1];
      const props = extractObjectKeys(valueExpr);
      stores.push({ storeName, properties: props });
    }

    // Match NoJS.config({ stores: { name: { ... }, ... } }) in <script> blocks
    const configStoresIdx = text.indexOf('stores', text.indexOf('NoJS.config('));
    if (configStoresIdx !== -1 && text.indexOf('NoJS.config(') !== -1) {
      const colonIdx = text.indexOf('{', text.indexOf(':', configStoresIdx));
      if (colonIdx !== -1) {
        let depth = 0;
        let blockEnd = -1;
        for (let i = colonIdx; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') { depth--; if (depth === 0) { blockEnd = i; break; } }
        }
        if (blockEnd !== -1) {
          const storesBlock = text.substring(colonIdx + 1, blockEnd);
          const entryRegex = /([a-zA-Z_$][\w$]*)\s*:\s*(\{[^}]*\})/g;
          let entryMatch;
          while ((entryMatch = entryRegex.exec(storesBlock)) !== null) {
            const storeName = entryMatch[1];
            if (seen.has(storeName)) continue;
            seen.add(storeName);
            const props = extractObjectKeys(entryMatch[2]);
            stores.push({ storeName, properties: props });
          }
        }
      }
    }
  }

  return stores;
}

/**
 * Extract top-level property names from a JS object literal string.
 * e.g., "{ name: 'Erick', role: 'admin', items: [] }" → ["name", "role", "items"]
 */
function extractObjectKeys(expr: string): string[] {
  const keys: string[] = [];
  // Strip outer braces
  const inner = expr.replace(/^\{|\}$/g, '').trim();
  if (!inner) return keys;

  // Simple key extraction: match word before colon, respecting nesting
  const keyRegex = /(?:^|,)\s*([a-zA-Z_$][\w$]*)\s*:/g;
  let match;
  while ((match = keyRegex.exec(inner)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

// ─── Custom Directive Scanning ───

export interface CustomDirectiveInfo {
  name: string;
  filePath: string;
}

/**
 * Scan JS files for NoJS.directive() calls to detect custom directives.
 */
export function scanCustomDirectives(workspaceRoot: string, token?: CancellationToken): CustomDirectiveInfo[] {
  const results: CustomDirectiveInfo[] = [];
  scanJsFilesForDirectives(workspaceRoot, results, 0, token);
  return results;
}

function scanJsFilesForDirectives(dir: string, results: CustomDirectiveInfo[], depth: number, token?: CancellationToken): void {
  if (depth > 5) return; // limit recursion depth
  if (token?.isCancellationRequested) return;
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    if (token?.isCancellationRequested) return;
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    if (!isWithinWorkspace(fullPath)) continue;
    const stat = safeStat(fullPath);
    if (!stat) continue;

    if (stat.isFile() && /\.(js|mjs|ts)$/.test(entry)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Match NoJS.directive('name', ...) or NoJS.directive("name", ...)
        const regex = /NoJS\.directive\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          results.push({ name: match[1], filePath: fullPath });
        }
      } catch {
        // skip unreadable files
      }
    } else if (stat.isDirectory()) {
      scanJsFilesForDirectives(fullPath, results, depth + 1, token);
    }
  }
}

// Also scan inline <script> blocks in HTML documents
export function scanCustomDirectivesInDocuments(documents: TextDocuments<TextDocument>): CustomDirectiveInfo[] {
  const results: CustomDirectiveInfo[] = [];
  for (const doc of documents.all()) {
    const text = doc.getText();
    const regex = /NoJS\.directive\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({ name: match[1], filePath: URI.parse(doc.uri).fsPath });
    }
  }
  return results;
}

// ─── Template var-* Attribute Scanning ───

export interface TemplateVarInfo {
  templateId: string;
  varNames: string[];
}

/**
 * Scan a document for template definitions and extract their var-* attribute declarations.
 * If a template uses var="name" or has expressions referencing specific variable names,
 * those become suggested var-* attributes when use="templateId" is typed.
 */
export function scanTemplateVars(text: string): TemplateVarInfo[] {
  const results: TemplateVarInfo[] = [];
  // Match <template id="xxx" var="varName">
  const templateRegex = /<template\s+id="([^"]+)"(?:\s+var="([^"]+)")?[^>]*>([\s\S]*?)<\/template>/g;
  let match;
  while ((match = templateRegex.exec(text)) !== null) {
    const templateId = match[1];
    const varAttr = match[2];
    const varNames: string[] = [];

    if (varAttr) {
      varNames.push(varAttr);
    }

    // Also look for var-* attributes in use directives referencing this template
    const useRegex = new RegExp(`use="${templateId}"[^>]*`, 'g');
    let useMatch;
    while ((useMatch = useRegex.exec(text)) !== null) {
      const varAttrRegex = /var-(\w+)/g;
      let varMatch;
      while ((varMatch = varAttrRegex.exec(useMatch[0])) !== null) {
        if (!varNames.includes(varMatch[1])) {
          varNames.push(varMatch[1]);
        }
      }
    }

    if (varNames.length > 0) {
      results.push({ templateId, varNames });
    }
  }
  return results;
}

// ─── Utility ───

function findDirectories(root: string, name: string): string[] {
  const results: string[] = [];
  findDirsRecursive(root, name, results, 0);
  return results;
}

function findDirsRecursive(dir: string, name: string, results: string[], depth: number): void {
  if (depth > 4) return;
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    if (!isWithinWorkspace(fullPath)) continue;
    const stat = safeStat(fullPath);
    if (!stat) continue;
    if (stat.isDirectory()) {
      if (entry === name) {
        results.push(fullPath);
      } else {
        findDirsRecursive(fullPath, name, results, depth + 1);
      }
    }
  }
}

/**
 * Resolve symlinks and verify the real path stays within the workspace root.
 * Returns false if the path escapes the workspace or cannot be resolved.
 */
export function isWithinWorkspace(filePath: string): boolean {
  if (workspaceRoots.length === 0) return true; // no workspace set → allow
  try {
    const resolved = fs.realpathSync(filePath);
    return workspaceRoots.some(root => {
      const normalizedRoot = fs.realpathSync(root) + path.sep;
      return resolved === fs.realpathSync(root) || resolved.startsWith(normalizedRoot);
    });
  } catch {
    return false; // unresolvable symlinks are rejected
  }
}

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function safeExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// ─── Workspace Cache ───

export interface WorkspaceData {
  i18nKeys: I18nKeyInfo[];
  routes: RouteInfo[];
  storeProperties: StorePropertyInfo[];
  customDirectives: CustomDirectiveInfo[];
  templateVars: TemplateVarInfo[];
}

let cachedData: WorkspaceData | null = null;
let workspaceRoots: string[] = [];

export function setWorkspaceRoots(roots: string[]): void {
  workspaceRoots = roots;
  cachedData = null; // invalidate cache
}

export function getWorkspaceData(documents: TextDocuments<TextDocument>, token?: CancellationToken): WorkspaceData {
  if (cachedData) return cachedData;

  const i18nKeys: I18nKeyInfo[] = [];
  const routes: RouteInfo[] = [];
  const customDirectives: CustomDirectiveInfo[] = [];

  for (const root of workspaceRoots) {
    if (token?.isCancellationRequested) return emptyWorkspaceData();
    i18nKeys.push(...scanI18nKeys(root, token));
    if (token?.isCancellationRequested) return emptyWorkspaceData();
    routes.push(...scanRoutes(root));
    if (token?.isCancellationRequested) return emptyWorkspaceData();
    customDirectives.push(...scanCustomDirectives(root, token));
  }

  // Also scan inline scripts
  customDirectives.push(...scanCustomDirectivesInDocuments(documents));

  const storeProperties = scanStoreProperties(documents);

  // Scan template vars from all open documents
  const templateVars: TemplateVarInfo[] = [];
  for (const doc of documents.all()) {
    if (token?.isCancellationRequested) return emptyWorkspaceData();
    templateVars.push(...scanTemplateVars(doc.getText()));
  }

  cachedData = { i18nKeys, routes, storeProperties, customDirectives, templateVars };
  return cachedData;
}

function emptyWorkspaceData(): WorkspaceData {
  return { i18nKeys: [], routes: [], storeProperties: [], customDirectives: [], templateVars: [] };
}

export function invalidateCache(): void {
  cachedData = null;
}
