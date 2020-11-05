import { module, test } from 'qunit';
import { visit, find, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | helper', function(hooks) {
  setupApplicationTest(hooks);

  test('modifier works', async function(assert) {
    await visit('/');
    assert.equal(find('.global').textContent, "I'm a globally referenced modifier");
    assert.equal(find('.local').textContent, "I'm a locally referenced modifier");

    assert.equal(findAll('.global').length, 1);
    assert.equal(findAll('.local').length, 2);

    assert.equal(find('.complex').textContent, 'Im a complex modifier');
  });
});
