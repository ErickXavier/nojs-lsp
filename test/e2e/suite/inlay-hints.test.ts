import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, openFixture, getInlayHints, findPosition } from './helper';

suite('E2E: Inlay Hints', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('shows loop context variables for each directive', async () => {
    const doc = await openFixture('all-directives.html');
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      doc.positionAt(doc.getText().length)
    );
    const hints = await getInlayHints(doc, fullRange);
    // Look for a hint that mentions $index (from each directive)
    const loopHint = hints.find(h => {
      const label = typeof h.label === 'string' ? h.label : h.label.map((p: any) => p.value).join('');
      return label.includes('$index');
    });
    assert.ok(loopHint, 'Should show loop context variables for each directive');
  });

  test('shows HTTP method badge for get with as', async () => {
    const doc = await openFixture('all-directives.html');
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      doc.positionAt(doc.getText().length)
    );
    const hints = await getInlayHints(doc, fullRange);
    const httpHint = hints.find(h => {
      const label = typeof h.label === 'string' ? h.label : h.label.map((p: any) => p.value).join('');
      return label.includes('GET');
    });
    assert.ok(httpHint, 'Should show GET badge for get directive with as');
  });
});
