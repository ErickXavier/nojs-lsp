import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { onCompletion, onCompletionResolve, CompletionSettings } from '../../server/src/providers/completion';
import { invalidateCache } from '../../server/src/workspace-scanner';

// Mock TextDocuments
function createMockDocuments(content: string) {
  const doc = TextDocument.create('file:///test.html', 'html', 1, content);
  return {
    get: (uri: string) => uri === doc.uri ? doc : undefined,
    all: () => [doc],
    doc,
  };
}

function getCompletions(content: string, offset: number, settings?: Partial<CompletionSettings>): Promise<CompletionItem[]> {
  invalidateCache(); // ensure fresh workspace data per test
  const mock = createMockDocuments(content);
  const mergedSettings: CompletionSettings = {
    filtersEnabled: true,
    customFilters: [],
    customValidators: [],
    ...settings,
  };
  const handler = onCompletion(mock as any, async () => mergedSettings);
  const position = mock.doc.positionAt(offset);
  return handler({
    textDocument: { uri: mock.doc.uri },
    position,
    context: undefined as any,
  });
}

describe('CompletionProvider', () => {
  // ─── Directive name completions ──────────────────────────────────────
  describe('Directive name completions', () => {
    it('suggests directives when typing in attribute position', async () => {
      const content = '<div ></div>';
      const items = await getCompletions(content, 5); // after space, before >
      expect(items.length).toBeGreaterThan(0);
      const labels = items.map(i => i.label);
      expect(labels).toContain('state');
      expect(labels).toContain('if');
      expect(labels).toContain('each');
      expect(labels).toContain('for');
    });

    it('filters directives by partial input', async () => {
      const content = '<div st></div>';
      const items = await getCompletions(content, 6); // after "st"
      const labels = items.map(i => i.label);
      expect(labels).toContain('state');
      expect(labels).toContain('store');
    });

    it('does not suggest already-present directives', async () => {
      const content = '<div state="{ x: 1 }" ></div>';
      const items = await getCompletions(content, 22); // after space
      const labels = items.map(i => i.label);
      expect(labels).not.toContain('state');
    });
  });

  // ─── Pattern-based completions ───────────────────────────────────────
  describe('Pattern-based completions', () => {
    it('suggests on: events', async () => {
      const content = '<button on></button>';
      const items = await getCompletions(content, 10); // after "on"
      const labels = items.map(i => i.label);
      const onItems = labels.filter(l => l.startsWith('on:'));
      expect(onItems.length).toBeGreaterThan(0);
    });

    it('suggests bind- targets', async () => {
      const content = '<a bind></a>';
      const items = await getCompletions(content, 7); // after "bind"
      const labels = items.map(i => i.label);
      const bindItems = labels.filter(l => l.startsWith('bind-'));
      expect(bindItems.length).toBeGreaterThan(0);
    });

    it('suggests class-* and style-* patterns', async () => {
      const content = '<div cl></div>';
      const items = await getCompletions(content, 7); // after "cl"
      const labels = items.map(i => i.label);
      const classItems = labels.filter(l => l.startsWith('class-'));
      expect(classItems.length).toBeGreaterThan(0);
    });

    it('suggests lifecycle events under on:', async () => {
      const content = '<div on:></div>';
      const items = await getCompletions(content, 8); // after "on:"
      const labels = items.map(i => i.label);
      expect(labels).toContain('on:init');
      expect(labels).toContain('on:mounted');
    });
  });

  // ─── Companion completions ───────────────────────────────────────────
  describe('Companion completions', () => {
    it('suggests companion attributes when directive is present', async () => {
      const content = '<div get="/api/users" ></div>';
      const items = await getCompletions(content, 22); // after space
      const labels = items.map(i => i.label);
      expect(labels).toContain('as');
    });

    it('suggests foreach companion attributes', async () => {
      const content = '<li foreach="item in items" ></li>';
      const items = await getCompletions(content, 28); // after space
      const labels = items.map(i => i.label);
      expect(labels).not.toContain('from');
      expect(labels).toContain('filter');
      expect(labels).toContain('sort');
      expect(labels).toContain('limit');
      expect(labels).toContain('offset');
      expect(labels).toContain('template');
    });

    it('suggests each companion attributes including filter/sort/limit/offset', async () => {
      const content = '<li each="item in items" ></li>';
      const items = await getCompletions(content, 25); // after space
      const labels = items.map(i => i.label);
      expect(labels).toContain('filter');
      expect(labels).toContain('sort');
      expect(labels).toContain('limit');
      expect(labels).toContain('offset');
      expect(labels).toContain('template');
    });

    it('suggests for companion attributes', async () => {
      const content = '<li for="item in items" ></li>';
      const items = await getCompletions(content, 24); // after space
      const labels = items.map(i => i.label);
      expect(labels).toContain('filter');
      expect(labels).toContain('sort');
      expect(labels).toContain('limit');
      expect(labels).toContain('offset');
      expect(labels).toContain('template');
    });
  });

  // ─── Filter completions ──────────────────────────────────────────────
  describe('Filter completions', () => {
    it('suggests filters after pipe in attribute value', async () => {
      const content = '<span bind="name | "></span>';
      const items = await getCompletions(content, 19); // after "| "
      const labels = items.map(i => i.label);
      expect(labels).toContain('uppercase');
      expect(labels).toContain('lowercase');
      expect(labels).toContain('currency');
    });

    it('filters filter suggestions by partial input', async () => {
      const content = '<span bind="name | up"></span>';
      const items = await getCompletions(content, 21); // after "up"
      const labels = items.map(i => i.label);
      expect(labels).toContain('uppercase');
      expect(labels).not.toContain('lowercase');
    });
  });

  // ─── Filter argument hints ───────────────────────────────────────────
  describe('Filter argument hints', () => {
    it('suggests argument info after filter name and colon', async () => {
      const content = '<span bind="name | truncate:"></span>';
      const items = await getCompletions(content, 28); // after "truncate:"
      expect(items.length).toBeGreaterThan(0);
      const argItem = items[0];
      expect(argItem.detail).toContain('truncate');
    });

    it('returns empty when filter has no args', async () => {
      const content = '<span bind="name | uppercase:"></span>';
      const items = await getCompletions(content, 29);
      // uppercase has no arguments, so filter arg completions should be empty
      expect(items.length).toBe(0);
    });
  });

  // ─── Animation completions ──────────────────────────────────────────
  describe('Animation completions', () => {
    it('suggests animation names for animate attribute', async () => {
      const content = '<div animate=""></div>';
      const items = await getCompletions(content, 14); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('fadeIn');
    });

    it('suggests animation names for animate-enter attribute', async () => {
      const content = '<div animate-enter=""></div>';
      const items = await getCompletions(content, 20); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('fadeIn');
    });

    it('suggests animation names for animate-leave attribute', async () => {
      const content = '<div animate-leave=""></div>';
      const items = await getCompletions(content, 20); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('fadeOut');
    });

    it('filters animation names by partial input', async () => {
      const content = '<div animate="fade"></div>';
      const items = await getCompletions(content, 18); // after "fade"
      const labels = items.map(i => i.label);
      expect(labels).toContain('fadeIn');
      expect(labels).not.toContain('slideDown');
    });
  });

  // ─── HTTP method values ──────────────────────────────────────────────
  describe('HTTP method completions', () => {
    it('suggests HTTP methods for method attribute on HTTP elements', async () => {
      const content = '<form get="/api" method=""></form>';
      const items = await getCompletions(content, 25); // inside method=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('GET');
      expect(labels).toContain('POST');
      expect(labels).toContain('PUT');
      expect(labels).toContain('PATCH');
      expect(labels).toContain('DELETE');
    });
  });

  // ─── Lazy mode values ────────────────────────────────────────────────
  describe('Lazy mode completions', () => {
    it('suggests lazy loading modes for lazy attribute', async () => {
      const content = '<div lazy=""></div>';
      const items = await getCompletions(content, 11); // inside lazy=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('ondemand');
      expect(labels).toContain('priority');
    });
  });

  // ─── View Transition presets ─────────────────────────────────────────
  describe('View Transition completions', () => {
    it('suggests transition presets on route-view element (attribute form)', async () => {
      const content = '<main route-view transition=""></main>';
      const items = await getCompletions(content, 29); // inside transition=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('slide');
      expect(labels).toContain('fade');
      expect(labels).toContain('scale');
      expect(labels).toContain('none');
    });

    it('does not suggest transition presets on non-route-view elements', async () => {
      const content = '<div transition=""></div>';
      const items = await getCompletions(content, 17); // inside transition=""
      const labels = items.map(i => i.label);
      expect(labels).not.toContain('slide');
      expect(labels).not.toContain('fade');
    });

    it('filters transition presets by partial input', async () => {
      const content = '<main route-view transition="sl"></main>';
      const items = await getCompletions(content, 31); // after "sl"
      const labels = items.map(i => i.label);
      expect(labels).toContain('slide');
      expect(labels).not.toContain('fade');
    });
  });

  // ─── Drop-sort direction values ──────────────────────────────────────
  describe('Drop-sort completions', () => {
    it('suggests sort directions for drop-sort attribute', async () => {
      const content = '<div drop-sort=""></div>';
      const items = await getCompletions(content, 16); // inside drop-sort=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('vertical');
      expect(labels).toContain('horizontal');
      expect(labels).toContain('grid');
    });
  });

  // ─── Drag/drop effect values ─────────────────────────────────────────
  describe('Drag/drop effect completions', () => {
    it('suggests drag effects for drag-effect attribute', async () => {
      const content = '<div drag-effect=""></div>';
      const items = await getCompletions(content, 18); // inside drag-effect=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('copy');
      expect(labels).toContain('move');
      expect(labels).toContain('link');
      expect(labels).toContain('none');
    });

    it('suggests drop effects for drop-effect attribute', async () => {
      const content = '<div drop-effect=""></div>';
      const items = await getCompletions(content, 18); // inside drop-effect=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('copy');
      expect(labels).toContain('move');
      expect(labels).toContain('link');
      expect(labels).toContain('none');
    });
  });

  // ─── Validator completions ───────────────────────────────────────────
  describe('Validator completions', () => {
    it('suggests validators for validate attribute', async () => {
      const content = '<input validate=""></input>';
      const items = await getCompletions(content, 17); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('required');
      expect(labels).toContain('email');
    });

    it('filters validators by partial input', async () => {
      const content = '<input validate="em"></input>';
      const items = await getCompletions(content, 19); // after "em"
      const labels = items.map(i => i.label);
      expect(labels).toContain('email');
      expect(labels).not.toContain('required');
    });
  });

  // ─── Validate-on trigger completions ─────────────────────────────────
  describe('Validate-on completions', () => {
    it('suggests validation triggers for validate-on attribute', async () => {
      const content = '<input validate="required" validate-on=""></input>';
      const items = await getCompletions(content, 40); // inside validate-on=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('input');
      expect(labels).toContain('blur');
      expect(labels).toContain('focusout');
      expect(labels).toContain('submit');
    });

    it('filters validate-on triggers by partial input', async () => {
      const content = '<input validate-on="bl"></input>';
      const items = await getCompletions(content, 22); // after "bl"
      const labels = items.map(i => i.label);
      expect(labels).toContain('blur');
      expect(labels).not.toContain('input');
    });
  });

  // ─── Event modifier completions ──────────────────────────────────────
  describe('Event modifier completions', () => {
    it('suggests modifiers after . on on: attributes', async () => {
      const content = '<button on:click.></button>';
      const items = await getCompletions(content, 17); // after "on:click."
      const labels = items.map(i => i.label);
      const modifierLabels = labels.filter(l => l.startsWith('on:click.'));
      expect(modifierLabels.length).toBeGreaterThan(0);
      expect(modifierLabels.some(l => l.includes('prevent'))).toBe(true);
      expect(modifierLabels.some(l => l.includes('stop'))).toBe(true);
    });

    it('does not suggest already-typed modifiers', async () => {
      const content = '<button on:click.prevent.></button>';
      const items = await getCompletions(content, 25); // after "on:click.prevent."
      const labels = items.map(i => i.label);
      const modifierLabels = labels.filter(l => l.startsWith('on:click.'));
      // prevent should not be repeated
      const preventItems = modifierLabels.filter(l => l === 'on:click.prevent.prevent');
      expect(preventItems.length).toBe(0);
    });

    it('filters modifiers by partial input', async () => {
      const content = '<button on:click.pr></button>';
      const items = await getCompletions(content, 19); // after "on:click.pr"
      const labels = items.map(i => i.label);
      const matchingMods = labels.filter(l => l.startsWith('on:click.'));
      expect(matchingMods.some(l => l.includes('prevent'))).toBe(true);
      expect(matchingMods.some(l => l.includes('stop'))).toBe(false);
    });
  });

  // ─── $form. sub-property completions ─────────────────────────────────
  describe('$form sub-property completions', () => {
    it('suggests $form properties in directive values', async () => {
      const content = '<span bind="$form."></span>';
      const items = await getCompletions(content, 18); // after "$form."
      const labels = items.map(i => i.label);
      expect(labels).toContain('$form.valid');
      expect(labels).toContain('$form.dirty');
      expect(labels).toContain('$form.errors');
      expect(labels).toContain('$form.firstError');
      expect(labels).toContain('$form.submitting');
    });

    it('filters $form properties by partial input', async () => {
      const content = '<span bind="$form.val"></span>';
      const items = await getCompletions(content, 21); // after "$form.val"
      const labels = items.map(i => i.label);
      expect(labels).toContain('$form.valid');
      expect(labels).toContain('$form.values');
      expect(labels).not.toContain('$form.dirty');
    });
  });

  // ─── Context key completions ─────────────────────────────────────────
  describe('Context key completions', () => {
    it('suggests context keys when $ is in expression', async () => {
      const content = '<span bind="$"></span>';
      const items = await getCompletions(content, 13); // after "$"
      const labels = items.map(i => i.label);
      expect(labels.some(l => l.startsWith('$'))).toBe(true);
    });
  });

  // ─── Event handler variable completions ──────────────────────────────
  describe('Event handler variable completions', () => {
    it('suggests event handler variables in on: attribute values', async () => {
      const content = '<button on:click="$"></button>';
      const items = await getCompletions(content, 19); // after "$"
      const labels = items.map(i => i.label);
      expect(labels).toContain('$event');
      expect(labels).toContain('$el');
    });
  });

  // ─── Route path completions ──────────────────────────────────────────
  describe('Route path completions', () => {
    it('suggests wildcard route for template elements', async () => {
      const content = '<template route=""></template>';
      const items = await getCompletions(content, 17); // inside route=""
      const labels = items.map(i => i.label);
      expect(labels).toContain('*');
    });

    it('returns empty when no file-based routes exist in workspace', async () => {
      // Route completions come from file-system scanning of pages/ directories,
      // not from inline <template route> elements in the document.
      const content = '<a route=""></a>';
      const offset = content.indexOf('"></a>');
      const items = await getCompletions(content, offset);
      const labels = items.map(i => i.label);
      // No file-based routes exist in test environment, so no route paths
      expect(labels.filter(l => l.startsWith('/'))).toHaveLength(0);
    });
  });

  // ─── Configuration: filters disabled ─────────────────────────────────
  describe('Configuration: filters disabled', () => {
    it('does not suggest filters when filtersEnabled is false', async () => {
      const content = '<span bind="name | "></span>';
      const items = await getCompletions(content, 19, { filtersEnabled: false });
      const labels = items.map(i => i.label);
      expect(labels).not.toContain('uppercase');
    });
  });

  // ─── Configuration: custom filters ───────────────────────────────────
  describe('Configuration: custom filters', () => {
    it('includes custom filter names in completions', async () => {
      const content = '<span bind="name | "></span>';
      const items = await getCompletions(content, 19, { customFilters: ['myCustomFilter'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myCustomFilter');
    });

    it('filters custom filters by partial input', async () => {
      const content = '<span bind="name | myC"></span>';
      const items = await getCompletions(content, 22, { customFilters: ['myCustomFilter', 'otherFilter'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myCustomFilter');
      expect(labels).not.toContain('otherFilter');
    });
  });

  // ─── Configuration: custom validators ────────────────────────────────
  describe('Configuration: custom validators', () => {
    it('includes custom validator names in completions', async () => {
      const content = '<input validate=""></input>';
      const items = await getCompletions(content, 17, { customValidators: ['myRule'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myRule');
    });

    it('filters custom validators by partial input', async () => {
      const content = '<input validate="my"></input>';
      const items = await getCompletions(content, 19, { customValidators: ['myRule', 'otherRule'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myRule');
      expect(labels).not.toContain('otherRule');
    });
  });

  // ─── Workspace-aware completions ─────────────────────────────────────
  describe('Phase 4: Workspace-aware completions', () => {
    it('suggests custom directive names from workspace', async () => {
      const content = `<script>NoJS.directive('tooltip', { init() {} });</script>\n<div ></div>`;
      const offset = content.indexOf('></div>');
      const items = await getCompletions(content, offset);
      const labels = items.map(i => i.label);
      expect(labels).toContain('tooltip');
    });

    it('suggests var-* attributes when use="templateId" is present', async () => {
      const content = `<template id="card" var="item"><div></div></template>\n<div use="card" ></div>`;
      const offset = content.indexOf('></div>', content.indexOf('use='));
      const items = await getCompletions(content, offset);
      const labels = items.map(i => i.label);
      expect(labels).toContain('var-item');
    });

    it('suggests store property paths with $store.', async () => {
      const content = '<div store="user" value="{ name: \'x\', role: \'y\' }"></div>\n<span bind="$store.user."></span>';
      const offset = content.indexOf('"></span>');
      const items = await getCompletions(content, offset);
      const labels = items.map(i => i.label);
      expect(labels).toContain('$store.user.name');
      expect(labels).toContain('$store.user.role');
    });

    it('suggests store names after $store.', async () => {
      const content = '<div store="cart" value="{ items: [] }"></div>\n<span bind="$store."></span>';
      const offset = content.indexOf('"></span>');
      const items = await getCompletions(content, offset);
      const labels = items.map(i => i.label);
      expect(labels).toContain('$store.cart');
    });
  });

  // ─── Plugin requirement note ─────────────────────────────────────────
  describe('Plugin-requirement note (derived from .plugin field)', () => {
    function docValue(item: CompletionItem | undefined): string {
      if (!item || !item.documentation) return '';
      return typeof item.documentation === 'string' ? item.documentation : item.documentation.value;
    }

    it('includes the requirement note in a gated directive completion (validate)', async () => {
      const content = '<form ></form>';
      const items = await getCompletions(content, 6); // after space
      const validate = items.find(i => i.label === 'validate');
      expect(validate).toBeDefined();
      expect(docValue(validate)).toContain('Requires the `@erickxavier/nojs-elements` plugin');
    });

    it('includes the requirement note in a companion completion derived from its parent', async () => {
      const content = '<div drag="item" ></div>';
      const items = await getCompletions(content, 17); // after space, drag present
      const handle = items.find(i => i.label === 'drag-handle');
      expect(handle).toBeDefined();
      expect(docValue(handle)).toContain('Requires the `@erickxavier/nojs-elements` plugin');
    });

    it('omits the requirement note for a non-gated directive (if)', async () => {
      const content = '<div ></div>';
      const items = await getCompletions(content, 5);
      const ifItem = items.find(i => i.label === 'if');
      expect(ifItem).toBeDefined();
      expect(docValue(ifItem)).not.toContain('Requires the `@erickxavier/nojs-elements` plugin');
    });
  });

  // ─── Document not found ──────────────────────────────────────────────
  describe('Edge cases', () => {
    it('returns empty array for unknown document URI', async () => {
      invalidateCache();
      const mock = createMockDocuments('<div></div>');
      const handler = onCompletion(mock as any, async () => ({
        filtersEnabled: true,
        customFilters: [],
        customValidators: [],
      }));
      const result = await handler({
        textDocument: { uri: 'file:///unknown.html' },
        position: { line: 0, character: 0 },
        context: undefined as any,
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when cursor is in text content (not attribute)', async () => {
      const content = '<div>some text here</div>';
      const items = await getCompletions(content, 10); // in text content
      expect(items).toEqual([]);
    });
  });

  // ─── onCompletionResolve ─────────────────────────────────────────────
  describe('onCompletionResolve', () => {
    it('returns the same item', () => {
      const item: CompletionItem = { label: 'test', kind: CompletionItemKind.Property };
      const resolved = onCompletionResolve(item);
      expect(resolved).toBe(item);
    });
  });
});
