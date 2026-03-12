import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Activate the NoJS extension and wait for the language server to be ready.
 */
export async function activateExtension(): Promise<vscode.Extension<any>> {
  const ext = vscode.extensions.getExtension('exs.nojs-lsp');
  if (!ext) {
    throw new Error('Extension not found');
  }
  if (!ext.isActive) {
    await ext.activate();
  }
  // Give the language server time to initialize
  await sleep(2000);
  return ext;
}

/**
 * Open a test fixture HTML file in the editor.
 */
export async function openFixture(filename: string): Promise<vscode.TextDocument> {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');
  const uri = vscode.Uri.file(path.join(fixturesDir, filename));
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
  // Wait for diagnostics and language features to compute
  await sleep(3000);
  return doc;
}

/**
 * Trigger completion at a specific position in the active document.
 */
export async function getCompletions(
  doc: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.CompletionList> {
  const result = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    doc.uri,
    position
  );
  return result;
}

/**
 * Get hover information at a specific position.
 */
export async function getHover(
  doc: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover[]> {
  const result = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider',
    doc.uri,
    position
  );
  return result ?? [];
}

/**
 * Get diagnostics for a document.
 */
export function getDiagnostics(doc: vscode.TextDocument): vscode.Diagnostic[] {
  return vscode.languages.getDiagnostics(doc.uri);
}

/**
 * Wait for diagnostics to appear on a document (with timeout).
 */
export async function waitForDiagnostics(
  doc: vscode.TextDocument,
  timeoutMs = 10000
): Promise<vscode.Diagnostic[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const diagnostics = getDiagnostics(doc);
    if (diagnostics.length > 0) return diagnostics;
    await sleep(500);
  }
  return getDiagnostics(doc);
}

/**
 * Find the position of a string in the document.
 */
export function findPosition(doc: vscode.TextDocument, searchText: string, occurrence = 1): vscode.Position {
  const text = doc.getText();
  let idx = -1;
  for (let i = 0; i < occurrence; i++) {
    idx = text.indexOf(searchText, idx + 1);
    if (idx === -1) {
      throw new Error(`Could not find occurrence ${occurrence} of "${searchText}" in document`);
    }
  }
  return doc.positionAt(idx);
}

/**
 * Find the position at the end of a string in the document.
 */
export function findEndPosition(doc: vscode.TextDocument, searchText: string, occurrence = 1): vscode.Position {
  const pos = findPosition(doc, searchText, occurrence);
  return doc.positionAt(doc.offsetAt(pos) + searchText.length);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute go-to-definition at a specific position.
 */
export async function getDefinitions(
  doc: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Location[]> {
  const result = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    doc.uri,
    position
  );
  return result ?? [];
}

/**
 * Get document symbols (outline) for a document.
 */
export async function getDocumentSymbols(
  doc: vscode.TextDocument
): Promise<vscode.DocumentSymbol[]> {
  const result = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    doc.uri
  );
  return result ?? [];
}

/**
 * Execute find references at a specific position.
 */
export async function getReferences(
  doc: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Location[]> {
  const result = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    doc.uri,
    position
  );
  return result ?? [];
}

/**
 * Get document links for a document.
 */
export async function getDocumentLinks(
  doc: vscode.TextDocument
): Promise<vscode.DocumentLink[]> {
  const result = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
    'vscode.executeDocumentLinkProvider',
    doc.uri
  );
  return result ?? [];
}

/**
 * Get code actions at a specific range.
 */
export async function getCodeActions(
  doc: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.CodeAction[]> {
  const result = await vscode.commands.executeCommand<vscode.CodeAction[]>(
    'vscode.executeCodeActionProvider',
    doc.uri,
    range
  );
  return result ?? [];
}

/**
 * Get inlay hints for a range.
 */
export async function getInlayHints(
  doc: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.InlayHint[]> {
  const result = await vscode.commands.executeCommand<vscode.InlayHint[]>(
    'vscode.executeInlayHintProvider',
    doc.uri,
    range
  );
  return result ?? [];
}
