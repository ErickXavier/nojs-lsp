# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.9.x   | :white_check_mark: |
| < 1.9   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in the No.JS LSP extension, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **<contact@no-js.dev>** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The affected version(s)
- Any potential impact assessment

### What to expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- **Fix and disclosure** coordinated with you before any public announcement

### Scope

The following are in scope:

- Expression analysis bypass or injection (`server/src/expression-analyzer.ts`)
- DevTools bridge CDP connection security (`server/src/devtools-bridge.ts`)
- Workspace scanner path traversal (`server/src/workspace-scanner.ts`)
- Arbitrary code execution via LSP server

### Out of scope

- Vulnerabilities in VS Code itself or the LSP protocol
- Issues requiring physical access to the user's machine
- Social engineering attacks

## Security Measures

The No.JS LSP extension implements the following security measures:

- **Loopback-only CDP connections** — hostname validation restricts DevTools bridge to localhost
- **WebSocket URL validation** — CDP targets are verified against loopback addresses
- **No `new Function()` or `eval()`** — expression analysis uses bracket/string balance validation
- **Strict TypeScript** — all types explicit, `strict: true` in tsconfig
