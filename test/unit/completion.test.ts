import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { onCompletion, CompletionSettings } from '../../server/src/providers/completion';
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
  describe('Directive name completions', () => {
    it('suggests directives when typing in attribute position', async () => {
      const content = '<div ></div>';
      const items = await getCompletions(content, 5); // after space, before >
      expect(items.length).toBeGreaterThan(0);
      const labels = items.map(i => i.label);
      expect(labels).toContain('state');
      expect(labels).toContain('if');
      expect(labels).toContain('each');
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
  });

  describe('Companion completions', () => {
    it('suggests companion attributes when directive is present', async () => {
      const content = '<div get="/api/users" ></div>';
      const items = await getCompletions(content, 22); // after space
      const labels = items.map(i => i.label);
      expect(labels).toContain('as');
    });
  });

  describe('Filter completions', () => {
    it('suggests filters after pipe in attribute value', async () => {
      const content = '<span text="name | "></span>';
      const items = await getCompletions(content, 19); // after "| "
      const labels = items.map(i => i.label);
      expect(labels).toContain('uppercase');
      expect(labels).toContain('lowercase');
      expect(labels).toContain('currency');
    });
  });

  describe('Animation completions', () => {
    it('suggests animation names for animate attribute', async () => {
      const content = '<div animate=""></div>';
      const items = await getCompletions(content, 14); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('fadeIn');
    });
  });

  describe('Validator completions', () => {
    it('suggests validators for validate attribute', async () => {
      const content = '<input validate=""></input>';
      const items = await getCompletions(content, 17); // inside quotes
      const labels = items.map(i => i.label);
      expect(labels).toContain('required');
      expect(labels).toContain('email');
    });
  });

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
  });

  describe('Filter argument hints', () => {
    it('suggests argument info after filter name and colon', async () => {
      const content = '<span bind="name | truncate:"></span>';
      const items = await getCompletions(content, 28); // after "truncate:"
      expect(items.length).toBeGreaterThan(0);
      const argItem = items[0];
      expect(argItem.detail).toContain('truncate');
    });
  });

  describe('Configuration: filters disabled', () => {
    it('does not suggest filters when filtersEnabled is false', async () => {
      const content = '<span text="name | "></span>';
      const items = await getCompletions(content, 19, { filtersEnabled: false });
      const labels = items.map(i => i.label);
      expect(labels).not.toContain('uppercase');
    });
  });

  describe('Configuration: custom filters', () => {
    it('includes custom filter names in completions', async () => {
      const content = '<span text="name | "></span>';
      const items = await getCompletions(content, 19, { customFilters: ['myCustomFilter'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myCustomFilter');
    });
  });

  describe('Configuration: custom validators', () => {
    it('includes custom validator names in completions', async () => {
      const content = '<input validate=""></input>';
      const items = await getCompletions(content, 17, { customValidators: ['myRule'] });
      const labels = items.map(i => i.label);
      expect(labels).toContain('myRule');
    });
  });

  describe('Phase 4: Workspace-aware completions', () => {
    it('suggests custom directive names from workspace', async () => {
      // The mock doesn't have real workspace files, but we can test that
      // the custom directive code path works by checking inline scripts
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
});
