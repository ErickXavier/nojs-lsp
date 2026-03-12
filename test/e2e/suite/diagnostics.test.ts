import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  activateExtension,
  openFixture,
  waitForDiagnostics,
  getDiagnostics,
  sleep,
} from './helper';

suite('E2E — Diagnostics Provider', function () {
  this.timeout(60000);

  suiteSetup(async () => {
    await activateExtension();
  });

  test('should report diagnostics for error conditions fixture', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);

    // Should find some diagnostics given the intentional error conditions in the fixture
    assert.ok(diagnostics.length > 0, `Expected diagnostics but got ${diagnostics.length}`);
  });

  test('should detect orphaned else', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);

    const orphanedElse = diagnostics.filter(d =>
      d.message.toLowerCase().includes('else') && d.message.toLowerCase().includes('if')
    );
    assert.ok(orphanedElse.length > 0, 'Should detect orphaned else without preceding if');
  });

  test('should detect unknown filters', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);

    const unknownFilters = diagnostics.filter(d =>
      d.message.toLowerCase().includes('unknown filter') ||
      d.message.toLowerCase().includes('nonexistentfilter') ||
      d.message.toLowerCase().includes('foobar')
    );
    assert.ok(unknownFilters.length > 0, 'Should detect unknown filter names');
  });

  test('should detect invalid event modifiers', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);

    const invalidMods = diagnostics.filter(d =>
      d.message.toLowerCase().includes('modifier') ||
      d.message.toLowerCase().includes('prevnt') ||
      d.message.toLowerCase().includes('stahp')
    );
    assert.ok(invalidMods.length > 0, 'Should detect invalid event modifiers');
  });

  test('should NOT produce false positives on valid directives', async () => {
    const doc = await openFixture('all-directives.html');
    const diagnostics = await waitForDiagnostics(doc, 5000);

    // The all-directives fixture should have zero or very few diagnostics
    // since all usage is intentionally valid
    const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
    assert.strictEqual(errors.length, 0, `Expected no errors in valid fixture, got ${errors.length}: ${errors.map(e => e.message).join(', ')}`);
  });
});
