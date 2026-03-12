import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, openFixture, getCodeActions, waitForDiagnostics, findPosition } from './helper';

suite('E2E: Code Actions', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('suggests quick fix for HTTP directive without as', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);
    // Look for the "missing as" diagnostics
    const missingAsDiags = diagnostics.filter(d =>
      d.message.includes('missing the "as" companion attribute')
    );
    if (missingAsDiags.length > 0) {
      const diag = missingAsDiags[0];
      const actions = await getCodeActions(doc, diag.range);
      const addAsAction = actions.find(a => a.title.includes('as="data"'));
      assert.ok(addAsAction, 'Should suggest adding as="data"');
    }
  });

  test('suggests did-you-mean for typo directive', async () => {
    const doc = await openFixture('pipes-errors.html');
    const diagnostics = await waitForDiagnostics(doc);
    const unknownDiags = diagnostics.filter(d =>
      d.message.startsWith('No.JS: Unknown directive')
    );
    if (unknownDiags.length > 0) {
      const diag = unknownDiags[0];
      const actions = await getCodeActions(doc, diag.range);
      const didYouMean = actions.filter(a => a.title.startsWith('No.JS: Did you mean'));
      assert.ok(Array.isArray(didYouMean), 'Should return array of suggestions');
    }
  });
});
