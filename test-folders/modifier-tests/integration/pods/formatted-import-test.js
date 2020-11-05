import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | different-imports', function(hooks) {
  setupRenderingTest(hooks);

  test('it can handle spaces, tabbed, multilined imports', async function(assert) {
    await render(hbs`{{different-imports}}`);
    assert.equal(find('.modifiers').textContent.match(/modifier+/g).length, 17);
  });
});
