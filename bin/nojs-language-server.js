#!/usr/bin/env node

// Standalone NoJS Language Server entry point
// Usage: nojs-language-server --stdio
// For non-VS Code editors (Neovim, Sublime Text, Emacs, Helix, etc.)

const path = require('path');

// The bundled server is at the same relative location
const serverPath = path.resolve(__dirname, '../out/server/src/server.js');
require(serverPath);
