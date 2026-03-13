/**
 * Semantic Tokens Provider
 * Provides semantic highlighting for NoJS directive attributes:
 * - Directive name → keyword
 * - Dynamic directive prefix (bind-, on:, class-, style-) → decorator
 * - Filter name → function
 * - Filter separator (|) → operator
 * - Store reference ($store) → variable.readonly
 * - Context vars ($index, $count, etc.) → variable.builtin
 */
import {
  SemanticTokensParams,
  SemanticTokens,
  SemanticTokensBuilder,
  SemanticTokensLegend,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseHtmlDocument, getAllElements } from '../html-parser';
import { isDirective, matchDirective, getFilter } from '../directive-registry';

// Semantic token types
export const TOKEN_TYPES = [
  'keyword',       // 0: directive names (state, if, each, etc.)
  'decorator',     // 1: dynamic prefixes (bind-, on:, class-, style-)
  'function',      // 2: filter names
  'operator',      // 3: pipe operator |
  'variable',      // 4: $store, $refs
  'parameter',     // 5: context vars ($index, $count, etc.)
] as const;

// Semantic token modifiers
export const TOKEN_MODIFIERS = [
  'readonly',      // 0: $store
  'declaration',   // 1: state, store, ref declarations
  'defaultLibrary',// 2: built-in context variables
] as const;

export const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

const DYNAMIC_PREFIXES = ['bind-', 'class-', 'style-'];
const CONTEXT_VARS = new Set([
  '$index', '$count', '$first', '$last', '$even', '$odd',
  '$event', '$el', '$old', '$new', '$error', '$rule',
  '$drag', '$dragType', '$dragEffect', '$dropIndex', '$source', '$target',
]);
const CONTEXT_REFS = new Set(['$store', '$refs', '$route', '$router', '$i18n', '$form', '$parent']);

export function onSemanticTokens(documents: TextDocuments<TextDocument>) {
  return (params: SemanticTokensParams): SemanticTokens => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return { data: [] };
    }

    const text = document.getText();
    const htmlDoc = parseHtmlDocument(document);
    const elements = getAllElements(htmlDoc, text);
    const builder = new SemanticTokensBuilder();

    for (const el of elements) {
      for (const attr of el.attributes) {
        const { name, value, nameStart, valueStart, valueEnd } = attr;

        // Check for dynamic prefixes: bind-*, class-*, style-*
        const dynamicPrefix = DYNAMIC_PREFIXES.find(p => name.startsWith(p));
        if (dynamicPrefix) {
          const prefixPos = document.positionAt(nameStart);
          // Mark the prefix as decorator
          builder.push(
            prefixPos.line, prefixPos.character,
            dynamicPrefix.length,
            1, // decorator
            0  // no modifier
          );
          // The suffix after the prefix is a regular attribute name, not a directive
          continue;
        }

        // on:event handling
        if (name.startsWith('on:')) {
          const prefixPos = document.positionAt(nameStart);
          // Mark "on:" as decorator
          builder.push(
            prefixPos.line, prefixPos.character,
            3, // "on:" length
            1, // decorator
            0  // no modifier
          );
          continue;
        }

        // Directive names
        if (isDirective(name)) {
          const matched = matchDirective(name);
          if (matched) {
            const pos = document.positionAt(nameStart);
            const modifierBitmask = (name === 'state' || name === 'store' || name === 'ref')
              ? 0b010 // declaration modifier
              : 0;
            builder.push(
              pos.line, pos.character,
              name.length,
              0, // keyword
              modifierBitmask
            );
          }
        }

        // Process expression values for filters and context vars
        if (value && valueStart !== -1 && valueEnd !== -1) {
          tokenizeExpressionValue(value, valueStart, document, builder);
        }
      }
    }

    return builder.build();
  };
}

function tokenizeExpressionValue(
  value: string,
  valueStartOffset: number,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  // Find pipe operators and filter names
  let i = 0;
  let depth = 0;
  let inString: string | null = null;

  while (i < value.length) {
    const ch = value[i];

    // Track string literals
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      i++;
      continue;
    }
    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inString) { inString = null; }
      i++;
      continue;
    }

    // Track depth
    if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; i++; continue; }

    // Pipe operator at top level
    if (ch === '|' && depth === 0) {
      // Skip logical OR ||
      if (i + 1 < value.length && value[i + 1] === '|') {
        i += 2;
        continue;
      }

      // Mark the pipe as operator
      const pipePos = document.positionAt(valueStartOffset + i);
      builder.push(pipePos.line, pipePos.character, 1, 3, 0); // operator

      // Extract the filter name after the pipe
      i++; // skip pipe
      // Skip whitespace
      while (i < value.length && value[i] === ' ') i++;

      if (i < value.length) {
        const filterNameMatch = value.substring(i).match(/^([a-zA-Z]\w*)/);
        if (filterNameMatch) {
          const filterName = filterNameMatch[1];
          // Only mark as function if it's a known filter
          if (getFilter(filterName)) {
            const filterPos = document.positionAt(valueStartOffset + i);
            builder.push(filterPos.line, filterPos.character, filterName.length, 2, 0); // function
          }
          i += filterName.length;
          continue;
        }
      }
      continue;
    }

    // Context variables ($store, $refs, $index, etc.)
    if (ch === '$' && depth === 0) {
      const rest = value.substring(i);
      const varMatch = rest.match(/^(\$\w+)/);
      if (varMatch) {
        const varName = varMatch[1];
        if (CONTEXT_REFS.has(varName)) {
          const varPos = document.positionAt(valueStartOffset + i);
          builder.push(
            varPos.line, varPos.character,
            varName.length,
            4, // variable
            0b001 // readonly modifier
          );
        } else if (CONTEXT_VARS.has(varName)) {
          const varPos = document.positionAt(valueStartOffset + i);
          builder.push(
            varPos.line, varPos.character,
            varName.length,
            5, // parameter
            0b100 // defaultLibrary modifier
          );
        }
        i += varName.length;
        continue;
      }
    }

    i++;
  }
}
