// Mock vscode module for tests
export const workspace = {
  createFileSystemWatcher: jest.fn(),
  getConfiguration: jest.fn(),
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
};

export const ExtensionContext = {};

export const languages = {
  createDiagnosticCollection: jest.fn(),
};

export const Uri = {
  file: (path: string) => ({ scheme: 'file', fsPath: path }),
};
