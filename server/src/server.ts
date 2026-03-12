import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getServerCapabilities } from './capabilities';
import { onCompletion, onCompletionResolve } from './providers/completion';
import { onHover } from './providers/hover';
import { validateTextDocument } from './providers/diagnostics';
import { onDefinition } from './providers/definition';
import { onReferences } from './providers/references';
import { onDocumentSymbol } from './providers/symbols';
import { onDocumentLinks } from './providers/links';
import { onSemanticTokens } from './providers/semantic-tokens';
import { onCodeAction } from './providers/code-actions';
import { onInlayHints } from './providers/inlay-hints';
import { setWorkspaceRoots, invalidateCache } from './workspace-scanner';
import { createDevToolsBridge, destroyDevToolsBridge, getDevToolsBridge } from './devtools-bridge';
import { URI } from 'vscode-uri';

// Create a connection — supports both IPC (VS Code) and stdio (other editors)
const connection = createConnection(ProposedFeatures.all);

// Text document manager with incremental sync
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

interface NoJsSettings {
  validation: { enabled: boolean };
  completion: { filters: boolean };
  customFilters: string[];
  customValidators: string[];
  devtools: { enabled: boolean; port: number; host: string };
}

const defaultSettings: NoJsSettings = {
  validation: { enabled: true },
  completion: { filters: true },
  customFilters: [],
  customValidators: [],
  devtools: { enabled: false, port: 9222, host: 'localhost' },
};

let globalSettings: NoJsSettings = defaultSettings;
const documentSettings = new Map<string, Thenable<NoJsSettings>>();

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  // Set workspace roots for scanning
  const roots: string[] = [];
  if (params.workspaceFolders) {
    for (const folder of params.workspaceFolders) {
      roots.push(URI.parse(folder.uri).fsPath);
    }
  } else if (params.rootUri) {
    roots.push(URI.parse(params.rootUri).fsPath);
  }
  setWorkspaceRoots(roots);

  return {
    capabilities: getServerCapabilities(hasWorkspaceFolderCapability),
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(async () => {
      const folders = await connection.workspace.getWorkspaceFolders();
      const roots = (folders ?? []).map(f => URI.parse(f.uri).fsPath);
      setWorkspaceRoots(roots);
      connection.console.log('Workspace folder change event received.');
    });
  }
});

connection.onDidChangeConfiguration(async (change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = (change.settings?.nojs || defaultSettings) as NoJsSettings;
  }
  // Revalidate all open documents
  documents.all().forEach(validateDoc);

  // Handle devtools bridge connection/disconnection
  const settings = hasConfigurationCapability
    ? await connection.workspace.getConfiguration({ section: 'nojs' }) as NoJsSettings
    : globalSettings;
  const dt = settings.devtools ?? defaultSettings.devtools;
  if (dt.enabled) {
    const bridge = getDevToolsBridge();
    const portChanged = bridge && bridge.options.port !== dt.port;
    const hostChanged = bridge && bridge.options.host !== dt.host;
    if (!bridge || !bridge.connected || portChanged || hostChanged) {
      const newBridge = createDevToolsBridge({ port: dt.port, host: dt.host });
      const ok = await newBridge.connect();
      connection.console.log(ok
        ? `[NoJS DevTools] Connected to ${newBridge.targetUrl}`
        : '[NoJS DevTools] Could not connect — is Chrome running with --remote-debugging-port?');
    }
  } else {
    destroyDevToolsBridge();
  }
});

export function getDocumentSettings(resource: string): Thenable<NoJsSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'nojs',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Clear settings when document is closed
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// Invalidate workspace cache on document changes (store/template changes, etc.)
documents.onDidSave(() => {
  invalidateCache();
});

// Validate on content changes with debounce
const validationTimers = new Map<string, ReturnType<typeof setTimeout>>();

function validateDoc(document: TextDocument) {
  const uri = document.uri;
  const existing = validationTimers.get(uri);
  if (existing) clearTimeout(existing);

  validationTimers.set(
    uri,
    setTimeout(async () => {
      validationTimers.delete(uri);
      const settings = await getDocumentSettings(uri);
      validateTextDocument(document, connection, {
        validationEnabled: settings.validation.enabled,
      });
    }, 200)
  );
}

documents.onDidChangeContent((change) => {
  validateDoc(change.document);
});

// Wire up providers
connection.onCompletion(onCompletion(documents, async (uri) => {
  const s = await getDocumentSettings(uri);
  return {
    filtersEnabled: s.completion.filters,
    customFilters: s.customFilters,
    customValidators: s.customValidators,
  };
}));
connection.onCompletionResolve(onCompletionResolve);
connection.onHover(onHover(documents, getDevToolsBridge));
connection.onDefinition(onDefinition(documents));
connection.onReferences(onReferences(documents));
connection.onDocumentSymbol(onDocumentSymbol(documents));
connection.onDocumentLinks(onDocumentLinks(documents));
connection.languages.semanticTokens.on(onSemanticTokens(documents));
connection.onCodeAction(onCodeAction(documents));
connection.languages.inlayHint.on(onInlayHints(documents));

// Start listening
documents.listen(connection);
connection.listen();
