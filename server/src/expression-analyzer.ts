/**
 * Expression Analyzer — parses No.JS directive expressions.
 * Handles pipe syntax (expr | filter1 | filter2:arg), detects syntax errors,
 * and extracts filter names and arguments from expressions.
 */

export interface FilterSegment {
  name: string;
  args: string[];
  /** Offset of the filter name within the original expression string */
  offset: number;
}

export interface ParsedExpression {
  /** The base expression before any filters */
  base: string;
  /** Parsed filter/pipe segments */
  filters: FilterSegment[];
  /** Whether the base expression has a syntax error */
  syntaxError: string | null;
}

/**
 * Parse a directive expression value, splitting by pipe operators
 * and extracting filter names and arguments.
 *
 * Examples:
 *   "name | uppercase" → { base: "name", filters: [{ name: "uppercase", args: [], offset: 7 }] }
 *   "price | currency:'USD'" → { base: "price", filters: [{ name: "currency", args: ["'USD'"], offset: 8 }] }
 *   "items | where:'active' | count" → base + 2 filters
 */
export function parseExpression(expr: string): ParsedExpression {
  if (!expr || !expr.trim()) {
    return { base: '', filters: [], syntaxError: null };
  }

  const segments = splitPipes(expr);
  const base = segments[0].text.trim();
  const filters: FilterSegment[] = [];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const trimmed = seg.text.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      filters.push({
        name: trimmed,
        args: [],
        offset: seg.offset + (seg.text.length - seg.text.trimStart().length),
      });
    } else {
      const name = trimmed.substring(0, colonIdx).trim();
      const argsStr = trimmed.substring(colonIdx + 1);
      const args = splitFilterArgs(argsStr);
      filters.push({
        name,
        args,
        offset: seg.offset + (seg.text.length - seg.text.trimStart().length),
      });
    }
  }

  const syntaxError = validateExpressionSyntax(base);

  return { base, filters, syntaxError };
}

interface PipeSegment {
  text: string;
  offset: number;
}

/**
 * Split an expression string by pipe `|` operators, respecting:
 * - String literals (single and double quotes)
 * - Template literals (backticks)
 * - Logical OR `||`
 * - Bitwise OR inside parentheses/brackets
 */
function splitPipes(expr: string): PipeSegment[] {
  const segments: PipeSegment[] = [];
  let current = '';
  let currentStart = 0;
  let i = 0;
  let depth = 0; // paren/bracket depth

  while (i < expr.length) {
    const ch = expr[i];

    // Handle string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      current += ch;
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\') {
          current += expr[i++];
          if (i < expr.length) current += expr[i++];
        } else {
          current += expr[i++];
        }
      }
      if (i < expr.length) {
        current += expr[i++]; // closing quote
      }
      continue;
    }

    // Track depth for parens, brackets, braces
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
      i++;
      continue;
    }

    // Pipe operator — only at top level (depth 0)
    if (ch === '|' && depth === 0) {
      // Skip logical OR `||`
      if (i + 1 < expr.length && expr[i + 1] === '|') {
        current += '||';
        i += 2;
        continue;
      }
      // This is a filter pipe
      segments.push({ text: current, offset: currentStart });
      i++;
      currentStart = i;
      current = '';
      continue;
    }

    current += ch;
    i++;
  }

  segments.push({ text: current, offset: currentStart });
  return segments;
}

/**
 * Split filter arguments by `:`, respecting quoted strings.
 * e.g. "'USD':2" → ["'USD'", "2"]
 */
function splitFilterArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let i = 0;

  while (i < argsStr.length) {
    const ch = argsStr[i];

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      current += ch;
      i++;
      while (i < argsStr.length && argsStr[i] !== quote) {
        if (argsStr[i] === '\\') {
          current += argsStr[i++];
          if (i < argsStr.length) current += argsStr[i++];
        } else {
          current += argsStr[i++];
        }
      }
      if (i < argsStr.length) {
        current += argsStr[i++]; // closing quote
      }
      continue;
    }

    if (ch === ':') {
      args.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Validate basic JS expression syntax using bracket/paren/brace matching
 * and structural checks. Returns null if valid, or an error message if invalid.
 */
export function validateExpressionSyntax(expr: string): string | null {
  if (!expr || !expr.trim()) return null;

  const trimmed = expr.trim();

  // Skip validation for special expression patterns that aren't pure JS
  // "item in items" (each/foreach syntax)
  if (/^\w+\s+in\s+/.test(trimmed)) return null;
  // Object literal for state: "{ count: 0 }"
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return null;
  // Array literal
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return null;
  // Simple string identifiers (store names, template IDs, ref names, etc.)
  if (/^[\w.-]+$/.test(trimmed)) return null;
  // Quoted strings
  if (/^(['"`]).*\1$/.test(trimmed)) return null;
  // URL patterns
  if (/^\//.test(trimmed) || /^https?:\/\//.test(trimmed)) return null;
  // CSS values for style-* bindings
  if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|cm|mm|in)$/.test(trimmed)) return null;
  // Validator rules like "required|email|min:5"
  if (/^[a-zA-Z]+(\|[a-zA-Z]+(:\d+)?)*$/.test(trimmed)) return null;

  // Validate bracket/paren/brace balance and string literal matching
  const stack: string[] = [];
  let inStr = false;
  let strChar = '';

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (inStr) {
      if (ch === '\\' && i + 1 < trimmed.length) {
        i++; // skip escaped character
        continue;
      }
      if (ch === strChar) {
        if (strChar === '`') {
          inStr = false;
        } else {
          inStr = false;
        }
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = true;
      strChar = ch;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (ch === ')' || ch === ']' || ch === '}') {
      const open = stack.pop();
      const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{';
      if (open !== expected) {
        return `Unexpected '${ch}'`;
      }
    }
  }

  if (inStr) {
    return `Unterminated string literal`;
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    const close = unclosed === '(' ? ')' : unclosed === '[' ? ']' : '}';
    return `Expected '${close}'`;
  }

  return null;
}

/**
 * Extract all filter names from an expression string.
 * Useful for diagnostics validation.
 */
export function extractFilterNames(expr: string): string[] {
  const parsed = parseExpression(expr);
  return parsed.filters.map(f => f.name);
}
