# Contributing to NoJS LSP

Thank you for your interest in contributing to the NoJS LSP extension! Whether you're adding support for a new directive, fixing a diagnostics bug, or improving hover documentation — every contribution helps make the No.JS developer experience better.

This guide covers everything you need to get started with the language server extension.

---

## Table of Contents

- [Contributing to NoJS LSP](#contributing-to-nojs-lsp)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Project Structure](#project-structure)
  - [Development Setup](#development-setup)
    - [Prerequisites](#prerequisites)
    - [Install and Build](#install-and-build)
  - [Code Conventions](#code-conventions)
  - [Contribution Workflows](#contribution-workflows)
    - [Adding Support for a New Directive](#adding-support-for-a-new-directive)
    - [Adding Support for a New Filter](#adding-support-for-a-new-filter)
    - [Adding Support for a New Validator](#adding-support-for-a-new-validator)
    - [Adding a New LSP Provider](#adding-a-new-lsp-provider)
    - [Adding a New Snippet](#adding-a-new-snippet)
    - [Fixing a Bug](#fixing-a-bug)
  - [Testing](#testing)
    - [Running Tests](#running-tests)
    - [Writing Tests](#writing-tests)
  - [Testing Locally](#testing-locally)
    - [F5 in VS Code](#f5-in-vs-code)
    - [Install a .vsix](#install-a-vsix)
    - [Non-VS Code Editors](#non-vs-code-editors)
  - [Branch and Commit Conventions](#branch-and-commit-conventions)
    - [Branch Naming](#branch-naming)
    - [Commit Messages](#commit-messages)
  - [Pull Request Guidelines](#pull-request-guidelines)
  - [Quality Gates](#quality-gates)
  - [Relationship with the NoJS Framework](#relationship-with-the-nojs-framework)
  - [Version Management](#version-management)
  - [Need Help?](#need-help)

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and kind in all interactions.

---

## Getting Started

The NoJS LSP is a **VS Code language server extension** that provides IntelliSense for the [No.JS](https://github.com/ErickXavier/no-js) framework. It delivers completions, hover docs, diagnostics, go-to-definition, find references, semantic highlighting, code actions, inlay hints, and snippets for No.JS HTML attributes.

The extension follows the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) and is split into two parts:

| Component | Location | Purpose |
| --- | --- | --- |
| Client | `client/src/extension.ts` | VS Code extension entry point, spawns the LSP server via IPC |
| Server | `server/src/` | Language server logic, providers, and metadata |

---

## Project Structure

```plaintext
NoJS-LSP/
├── client/src/
│   └── extension.ts              # VS Code extension entry, spawns LSP server via IPC
├── server/src/
│   ├── server.ts                 # LSP server: lifecycle, workspace scanning, config
│   ├── capabilities.ts           # Server capability declarations
│   ├── directive-registry.ts     # getAllDirectives(), getPatterns(), getCompanionsForDirectives()
│   ├── expression-analyzer.ts    # Expression validation (validateExpressionSyntax)
│   ├── html-parser.ts            # HTML attribute parsing for LSP features
│   ├── workspace-scanner.ts      # Scans workspace for routes, stores, custom directives, i18n keys
│   ├── devtools-bridge.ts        # DevTools integration bridge
│   ├── data/
│   │   ├── directives.json       # 36+ directive definitions (companions, docs, categories)
│   │   ├── filters.json          # 32 built-in filters
│   │   └── validators.json       # Built-in form validators
│   └── providers/                # One file per LSP feature
│       ├── code-actions.ts       # Quick fixes
│       ├── completion.ts         # Directive/filter/validator/animation completions
│       ├── definition.ts         # Go-to-definition for templates/refs/stores
│       ├── diagnostics.ts        # Validation warnings, "did you mean?" suggestions
│       ├── hover.ts              # Inline documentation on hover
│       ├── inlay-hints.ts        # Loop variable hints
│       ├── links.ts              # Clickable URLs and file paths
│       ├── references.ts         # Find references across documents
│       ├── semantic-tokens.ts    # Syntax highlighting tokens
│       └── symbols.ts            # Document symbol outline
├── data/
│   └── nojs-custom-data.json     # VS Code HTML custom data for IntelliSense
├── snippets/
│   └── nojs.json                 # Code snippets
├── bin/
│   └── nojs-language-server.js   # Standalone CLI entry (--stdio)
├── test/
│   ├── __mocks__/vscode.ts       # VS Code API mock
│   ├── fixtures/                 # HTML test fixtures
│   └── unit/                     # Unit tests (one per module/provider)
├── esbuild.mjs                   # Build script
├── jest.config.js                # Test config (ts-jest, node env)
├── tsconfig.json                 # TypeScript config (strict, ES2020, CJS)
└── package.json
```

---

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **VS Code** (for testing the extension via F5)

### Install and Build

```bash
# Clone and install
git clone https://github.com/ErickXavier/nojs-lsp.git
cd nojs-lsp
npm install

# Compile (outputs to out/)
npm run compile

# Watch mode (rebuilds on file changes)
npm run watch

# Run unit tests
npm test

# Type check
npx tsc --noEmit
```

---

## Code Conventions

| Convention | Example |
| --- | --- |
| Strict TypeScript (`strict: true`) | All types must be explicit |
| Provider functions named `on<Feature>` | `onCompletion`, `onHover`, `onDefinition` |
| Metadata interfaces named `<Feature>Meta` | `DirectiveMeta`, `FilterMeta` |
| Function-based architecture | No classes — use pure functions for parsing, matching, and filtering |
| Data-driven metadata | Directive, filter, and validator info lives in JSON files under `server/src/data/` |
| One provider per file | Each LSP feature has its own file in `server/src/providers/` |

**General rules:**

- Keep functions small and focused
- Write tests for all new functionality
- Use descriptive names — the codebase favors clarity over brevity

---

## Contribution Workflows

### Adding Support for a New Directive

When the No.JS framework adds a new directive, the LSP needs to know about it so developers get completions, hover docs, and diagnostics.

- [ ] Add an entry to `server/src/data/directives.json` with name, description, category, companions, and examples
- [ ] Add the HTML attribute to `data/nojs-custom-data.json` for VS Code IntelliSense
- [ ] Add or update tests in `test/unit/` (completion, hover, diagnostics as applicable)

---

### Adding Support for a New Filter

- [ ] Add an entry to `server/src/data/filters.json` with name, description, and usage examples
- [ ] Update completion tests in `test/unit/completion.test.ts`

---

### Adding Support for a New Validator

- [ ] Add an entry to `server/src/data/validators.json` with name, description, and usage examples
- [ ] Update relevant tests in `test/unit/`

---

### Adding a New LSP Provider

Adding a new language feature (e.g., rename support, folding ranges) involves several files:

- [ ] Create the provider in `server/src/providers/<feature>.ts`
- [ ] Export an `on<Feature>` handler function
- [ ] Register the handler in `server/src/server.ts`
- [ ] Declare the capability in `server/src/capabilities.ts`
- [ ] Add a test file at `test/unit/<feature>.test.ts`

---

### Adding a New Snippet

- [ ] Add the snippet definition to `snippets/nojs.json`
- [ ] Follow the existing format: prefix, body, description

---

### Fixing a Bug

- [ ] Write a **failing test** that reproduces the bug
- [ ] Fix the code
- [ ] Run `npm test` — all tests must pass
- [ ] Run `npx tsc --noEmit` — no type errors
- [ ] Run `npm run compile` — build succeeds

---

## Testing

### Running Tests

```bash
# Run all unit tests
npm test

# Run a specific test file
npx jest test/unit/completion.test.ts

# Run tests matching a pattern
npx jest --testPathPattern="hover"
```

### Writing Tests

Tests live in `test/unit/` with one file per module or provider. The testing pattern is:

1. Create a mock `TextDocument` with HTML content
2. Call the provider function (e.g., `onCompletion`, `onHover`)
3. Assert the results

```typescript
// Example test structure
import { onHover } from '../../server/src/providers/hover';

describe('Hover Provider', () => {
  it('should show documentation for data-state', () => {
    const doc = createMockDocument('<div data-state="{ count: 0 }"></div>');
    const result = onHover(doc, position);
    expect(result).toBeDefined();
    expect(result.contents).toContain('state');
  });
});
```

- VS Code API is mocked via `test/__mocks__/vscode.ts`
- HTML test fixtures live in `test/fixtures/`
- Test environment: Node (not jsdom) with ts-jest

---

## Testing Locally

### F5 in VS Code

The fastest way to test your changes:

1. Open the NoJS-LSP project in VS Code
2. Press **F5** to launch the Extension Development Host
3. Open any HTML file with No.JS attributes in the new window
4. Test completions, hover, diagnostics, and other features

For server-side debugging, use the **"Launch Extension + Server"** compound launch configuration, which allows you to set breakpoints in the server code.

### Install a .vsix

To test the packaged extension:

```bash
# Package the extension
npm run package

# Install it
code --install-extension nojs-lsp-*.vsix
```

### Non-VS Code Editors

The language server supports the standard Language Server Protocol and can be used with any compatible editor:

```bash
# Compile first
npm run compile

# Start the language server via stdio
npx nojs-language-server --stdio
```

---

## Branch and Commit Conventions

### Branch Naming

Create your branch from `main` using one of these prefixes:

| Prefix | Use for |
| --- | --- |
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring (no behavior change) |
| `chore/` | Tooling, deps, CI, config |

Examples: `feat/rename-provider`, `fix/completion-duplicate-filters`, `docs/hover-examples`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```plaintext
<type>: <short description>

[optional body]
```

**Types:**

| Type | Purpose |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Maintenance (deps, CI, tooling) |
| `test` | Adding or updating tests |

**Examples:**

```plaintext
feat: add rename provider for data-ref attributes
fix: prevent duplicate filter completions in pipe expressions
docs: add examples to hover documentation for data-each
test: add coverage for workspace scanner route detection
```

---

## Pull Request Guidelines

1. **One concern per PR** — don't mix unrelated changes
2. **Describe what and why** — your PR description should explain the change and the reasoning behind it
3. **Link related issues** — use `Closes #123` or `Fixes #456` in the description
4. **Ensure all quality gates pass** before requesting review (see below)
5. **Keep it reviewable** — if a change is large, consider splitting it into smaller PRs
6. **Respond to feedback** — address review comments promptly and push updates

---

## Quality Gates

All of the following must pass before a PR can be merged.

| Gate | Command |
| --- | --- |
| Unit tests | `npm test` |
| Type checking | `npx tsc --noEmit` |
| Build succeeds | `npm run compile` |

**Quick verification** — run this before pushing:

```bash
npm run compile && npm test && npx tsc --noEmit
```

---

## Relationship with the NoJS Framework

The LSP extension is a companion to the [No.JS framework](https://github.com/ErickXavier/no-js). Changes in the framework often require corresponding updates here:

| Framework change | LSP update needed |
| --- | --- |
| New directive | Add to `server/src/data/directives.json` and `data/nojs-custom-data.json` |
| New filter | Add to `server/src/data/filters.json` |
| New validator | Add to `server/src/data/validators.json` |
| Changed directive behavior | Update descriptions and examples in the relevant JSON file |

If you're contributing a feature to the framework that introduces new attributes, please open a companion PR in this repo as well — or note it in your framework PR so a maintainer can handle it.

---

## Version Management

- The LSP version must **always match** the No.JS framework version
- **Contributors should NOT bump versions** — maintainers handle version bumps and releases

---

## Need Help?

- **Questions?** Open a [Discussion](https://github.com/ErickXavier/no-js/discussions) on the framework repo
- **Found a bug?** Open an [Issue](https://github.com/ErickXavier/nojs-lsp/issues) with steps to reproduce
- **First-time contributor?** Look for issues labeled [`good first issue`](https://github.com/ErickXavier/nojs-lsp/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

We appreciate every contribution, no matter how small. Welcome aboard!
