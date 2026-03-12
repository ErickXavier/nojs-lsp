import {
  ServerCapabilities,
  TextDocumentSyncKind,
  CompletionOptions,
  SemanticTokensOptions,
} from 'vscode-languageserver/node';
import { SEMANTIC_TOKENS_LEGEND } from './providers/semantic-tokens';

export function getServerCapabilities(hasWorkspaceFolderCapability: boolean): ServerCapabilities {
  const capabilities: ServerCapabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,

    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ['-', ':', '.', '|', '$', '=', '"', "'"],
    } as CompletionOptions,

    hoverProvider: true,

    diagnosticProvider: undefined, // We use push-based diagnostics (publishDiagnostics)

    definitionProvider: true,

    referencesProvider: true,

    documentSymbolProvider: true,

    documentLinkProvider: {
      resolveProvider: false,
    },

    semanticTokensProvider: {
      legend: SEMANTIC_TOKENS_LEGEND,
      full: true,
    } as SemanticTokensOptions,

    codeActionProvider: {
      codeActionKinds: ['quickfix'],
    },

    inlayHintProvider: true,
  };

  if (hasWorkspaceFolderCapability) {
    capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return capabilities;
}
