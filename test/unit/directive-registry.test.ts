import {
  getAllDirectives,
  getDirective,
  getPatterns,
  matchDirective,
  isDirective,
  getAllFilters,
  getFilter,
  getAllValidators,
  getValidator,
  getCompanionsForDirectives,
  getAnimations,
  getLifecycleEvents,
  getContextKeys,
  getLoopContextVars,
  getEventHandlerVars,
  getEventModifiers,
  isHttpDirective,
  getAllDirectiveNames,
  getAllCompanionNames,
} from '../../server/src/directive-registry';

describe('DirectiveRegistry', () => {
  describe('getAllDirectives', () => {
    it('returns all exact-name directives', () => {
      const directives = getAllDirectives();
      expect(directives.length).toBeGreaterThanOrEqual(30);
    });

    it('includes known directives', () => {
      const names = getAllDirectives().map(d => d.name);
      expect(names).toContain('state');
      expect(names).toContain('if');
      expect(names).toContain('each');
      expect(names).toContain('get');
      expect(names).toContain('model');
      expect(names).toContain('bind');
    });
  });

  describe('getDirective', () => {
    it('returns directive metadata by exact name', () => {
      const dir = getDirective('state');
      expect(dir).toBeDefined();
      expect(dir!.name).toBe('state');
      expect(dir!.category).toBeDefined();
      expect(dir!.documentation).toBeDefined();
    });

    it('returns undefined for unknown directive', () => {
      expect(getDirective('unknown-directive')).toBeUndefined();
    });

    it('has correct properties for each directive', () => {
      const dir = getDirective('get');
      expect(dir).toBeDefined();
      expect(dir!.requiresValue).toBe(true);
      expect(dir!.valueType).toBeDefined();
      expect(dir!.companions.length).toBeGreaterThan(0);
    });
  });

  describe('getPatterns', () => {
    it('returns pattern-based directives', () => {
      const patterns = getPatterns();
      expect(patterns.length).toBe(4);
      const names = patterns.map(p => p.name);
      expect(names).toContain('bind-*');
      expect(names).toContain('on:*');
      expect(names).toContain('class-*');
      expect(names).toContain('style-*');
    });

    it('on:* has modifiers', () => {
      const onPattern = getPatterns().find(p => p.name === 'on:*');
      expect(onPattern).toBeDefined();
      expect(onPattern!.modifiers).toBeDefined();
      expect(onPattern!.modifiers!.behavioral.length).toBeGreaterThan(0);
    });

    it('bind-* has common targets', () => {
      const bindPattern = getPatterns().find(p => p.name === 'bind-*');
      expect(bindPattern).toBeDefined();
      expect(bindPattern!.commonTargets).toBeDefined();
      expect(bindPattern!.commonTargets!.length).toBeGreaterThan(0);
    });
  });

  describe('matchDirective', () => {
    it('matches exact directive names', () => {
      const result = matchDirective('state');
      expect(result).toBeDefined();
      expect(result!.name).toBe('state');
    });

    it('matches pattern-based directives', () => {
      const result = matchDirective('bind-href');
      expect(result).toBeDefined();
      expect(result!.name).toBe('bind-*');
    });

    it('matches on: events', () => {
      const result = matchDirective('on:click');
      expect(result).toBeDefined();
      expect(result!.name).toBe('on:*');
    });

    it('matches class-* pattern', () => {
      const result = matchDirective('class-active');
      expect(result).toBeDefined();
      expect(result!.name).toBe('class-*');
    });

    it('matches style-* pattern', () => {
      const result = matchDirective('style-color');
      expect(result).toBeDefined();
      expect(result!.name).toBe('style-*');
    });

    it('returns undefined for non-directives', () => {
      expect(matchDirective('id')).toBeUndefined();
      expect(matchDirective('class')).toBeUndefined();
      expect(matchDirective('data-custom')).toBeUndefined();
    });
  });

  describe('isDirective', () => {
    it('returns true for known directives', () => {
      expect(isDirective('state')).toBe(true);
      expect(isDirective('if')).toBe(true);
      expect(isDirective('bind-href')).toBe(true);
      expect(isDirective('on:click')).toBe(true);
    });

    it('returns false for non-directives', () => {
      expect(isDirective('id')).toBe(false);
      expect(isDirective('class')).toBe(false);
    });
  });

  describe('getCompanionsForDirectives', () => {
    it('returns companions for HTTP directives', () => {
      const companions = getCompanionsForDirectives(['get']);
      const names = companions.map(c => c.name);
      expect(names).toContain('as');
      expect(names).toContain('loading');
    });

    it('returns empty for directives without companions', () => {
      const companions = getCompanionsForDirectives(['text']);
      expect(companions.length).toBe(0);
    });

    it('deduplicates companions', () => {
      const companions = getCompanionsForDirectives(['get', 'post']);
      const names = companions.map(c => c.name);
      const unique = new Set(names);
      expect(names.length).toBe(unique.size);
    });
  });

  describe('Filters', () => {
    it('returns all filters', () => {
      const filters = getAllFilters();
      expect(filters.length).toBeGreaterThanOrEqual(30);
    });

    it('includes known filters', () => {
      const names = getAllFilters().map(f => f.name);
      expect(names).toContain('uppercase');
      expect(names).toContain('lowercase');
      expect(names).toContain('currency');
      expect(names).toContain('truncate');
    });

    it('returns filter by name', () => {
      const filter = getFilter('currency');
      expect(filter).toBeDefined();
      expect(filter!.name).toBe('currency');
      expect(filter!.description).toBeDefined();
      expect(filter!.example).toBeDefined();
    });

    it('returns undefined for unknown filter', () => {
      expect(getFilter('nonexistent')).toBeUndefined();
    });
  });

  describe('Validators', () => {
    it('returns all validators', () => {
      const validators = getAllValidators();
      expect(validators.length).toBeGreaterThanOrEqual(10);
    });

    it('includes known validators', () => {
      const names = getAllValidators().map(v => v.name);
      expect(names).toContain('required');
      expect(names).toContain('email');
      expect(names).toContain('min');
    });

    it('returns validator by name', () => {
      const validator = getValidator('email');
      expect(validator).toBeDefined();
      expect(validator!.description).toBeDefined();
    });
  });

  describe('Metadata arrays', () => {
    it('returns lifecycle events', () => {
      const events = getLifecycleEvents();
      expect(events).toContain('mounted');
      expect(events).toContain('init');
    });

    it('returns context keys', () => {
      const keys = getContextKeys();
      expect(keys).toContain('$refs');
      expect(keys).toContain('$store');
    });

    it('returns loop context vars', () => {
      const vars = getLoopContextVars();
      expect(vars).toContain('$index');
      expect(vars).toContain('$count');
    });

    it('returns animations', () => {
      const anims = getAnimations();
      expect(anims.length).toBeGreaterThan(0);
      expect(anims).toContain('fadeIn');
    });

    it('returns event handler vars', () => {
      const vars = getEventHandlerVars();
      expect(vars).toContain('$event');
    });

    it('returns event modifiers', () => {
      const mods = getEventModifiers();
      expect(mods.behavioral.length).toBeGreaterThan(0);
      expect(mods.behavioral).toContain('prevent');
      expect(mods.behavioral).toContain('stop');
    });
  });

  describe('isHttpDirective', () => {
    it('returns true for HTTP directives', () => {
      expect(isHttpDirective('get')).toBe(true);
      expect(isHttpDirective('post')).toBe(true);
      expect(isHttpDirective('put')).toBe(true);
      expect(isHttpDirective('patch')).toBe(true);
      expect(isHttpDirective('delete')).toBe(true);
    });

    it('returns false for non-HTTP directives', () => {
      expect(isHttpDirective('state')).toBe(false);
      expect(isHttpDirective('if')).toBe(false);
    });
  });

  describe('getAllDirectiveNames / getAllCompanionNames', () => {
    it('returns a set of directive names', () => {
      const names = getAllDirectiveNames();
      expect(names.size).toBeGreaterThanOrEqual(30);
      expect(names.has('state')).toBe(true);
    });

    it('returns a set of companion names', () => {
      const names = getAllCompanionNames();
      expect(names.size).toBeGreaterThan(0);
      expect(names.has('as')).toBe(true);
    });
  });
});
