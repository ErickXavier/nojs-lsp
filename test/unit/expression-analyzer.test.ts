import {
  parseExpression,
  validateExpressionSyntax,
  extractFilterNames,
} from '../../server/src/expression-analyzer';

describe('ExpressionAnalyzer', () => {
  describe('parseExpression', () => {
    it('parses a simple expression without filters', () => {
      const result = parseExpression('count + 1');
      expect(result.base).toBe('count + 1');
      expect(result.filters).toHaveLength(0);
      expect(result.syntaxError).toBeNull();
    });

    it('parses expression with one filter', () => {
      const result = parseExpression('name | uppercase');
      expect(result.base).toBe('name');
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].name).toBe('uppercase');
      expect(result.filters[0].args).toHaveLength(0);
    });

    it('parses expression with filter and arguments', () => {
      const result = parseExpression("price | currency:'USD'");
      expect(result.base).toBe('price');
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].name).toBe('currency');
      expect(result.filters[0].args).toEqual(["'USD'"]);
    });

    it('parses chained filters', () => {
      const result = parseExpression("items | where:'active' | count");
      expect(result.base).toBe('items');
      expect(result.filters).toHaveLength(2);
      expect(result.filters[0].name).toBe('where');
      expect(result.filters[0].args).toEqual(["'active'"]);
      expect(result.filters[1].name).toBe('count');
    });

    it('parses filter with multiple arguments', () => {
      const result = parseExpression('value | between:1:100');
      expect(result.base).toBe('value');
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].name).toBe('between');
      expect(result.filters[0].args).toEqual(['1', '100']);
    });

    it('ignores logical OR (||) in expressions', () => {
      const result = parseExpression('a || b');
      expect(result.base).toBe('a || b');
      expect(result.filters).toHaveLength(0);
    });

    it('handles empty expression', () => {
      const result = parseExpression('');
      expect(result.base).toBe('');
      expect(result.filters).toHaveLength(0);
    });

    it('handles pipes inside strings (should not split)', () => {
      const result = parseExpression("'hello|world'");
      expect(result.base).toBe("'hello|world'");
      expect(result.filters).toHaveLength(0);
    });

    it('handles pipes inside parentheses', () => {
      const result = parseExpression('fn(a | b)');
      expect(result.base).toBe('fn(a | b)');
      expect(result.filters).toHaveLength(0);
    });

    it('tracks filter offsets correctly', () => {
      const result = parseExpression('name | uppercase');
      // 'name | uppercase'
      //        ^ offset = 7
      expect(result.filters[0].offset).toBe(7);
    });
  });

  describe('validateExpressionSyntax', () => {
    it('returns null for valid expressions', () => {
      expect(validateExpressionSyntax('count + 1')).toBeNull();
      expect(validateExpressionSyntax('a > b ? "yes" : "no"')).toBeNull();
      expect(validateExpressionSyntax('items.length')).toBeNull();
    });

    it('returns null for "each" style expressions', () => {
      expect(validateExpressionSyntax('item in items')).toBeNull();
      expect(validateExpressionSyntax('user in users')).toBeNull();
    });

    it('returns null for object literals (state)', () => {
      expect(validateExpressionSyntax('{ count: 0, name: "test" }')).toBeNull();
    });

    it('returns null for simple identifiers', () => {
      expect(validateExpressionSyntax('username')).toBeNull();
      expect(validateExpressionSyntax('user.name')).toBeNull();
    });

    it('returns null for URL patterns', () => {
      expect(validateExpressionSyntax('/api/users')).toBeNull();
      expect(validateExpressionSyntax('https://api.test.com/users')).toBeNull();
    });

    it('returns null for empty expressions', () => {
      expect(validateExpressionSyntax('')).toBeNull();
      expect(validateExpressionSyntax('   ')).toBeNull();
    });

    it('returns error for invalid syntax', () => {
      const result = validateExpressionSyntax('count +* 1');
      expect(result).not.toBeNull();
    });

    it('returns null for assignment statements (event handlers)', () => {
      expect(validateExpressionSyntax('count = count + 1')).toBeNull();
    });
  });

  describe('extractFilterNames', () => {
    it('extracts filter names from piped expression', () => {
      const names = extractFilterNames('name | uppercase | truncate:20');
      expect(names).toEqual(['uppercase', 'truncate']);
    });

    it('returns empty array for no filters', () => {
      expect(extractFilterNames('simple')).toEqual([]);
    });
  });
});
