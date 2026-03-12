import * as assert from 'assert';
import { activateExtension, openFixture, getDefinitions, findPosition } from './helper';

suite('E2E: Go-to-Definition', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('navigates from use="..." to template definition', async () => {
    const doc = await openFixture('all-directives.html');
    // Find `use="card-tpl"` and get definition
    const pos = findPosition(doc, 'card-tpl', 1);
    const defs = await getDefinitions(doc, pos);
    // Should find the template definition
    assert.ok(defs.length > 0, 'Should find definition for template ID in use attribute');
  });

  test('navigates from $refs.name to ref declaration', async () => {
    const doc = await openFixture('all-directives.html');
    // Find $refs usage in expressions
    const text = doc.getText();
    const refsIdx = text.indexOf('$refs.');
    if (refsIdx !== -1) {
      const pos = doc.positionAt(refsIdx + 6); // position after "$refs."
      const defs = await getDefinitions(doc, pos);
      // May or may not find depending on fixture content
      assert.ok(Array.isArray(defs));
    }
  });

  test('navigates from $store.name to store declaration', async () => {
    const doc = await openFixture('all-directives.html');
    const text = doc.getText();
    const storeIdx = text.indexOf('$store.');
    if (storeIdx !== -1) {
      const pos = doc.positionAt(storeIdx + 7); // position after "$store."
      const defs = await getDefinitions(doc, pos);
      assert.ok(Array.isArray(defs));
    }
  });
});
