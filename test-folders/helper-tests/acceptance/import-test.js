import { module, test } from 'qunit';
import { visit, find, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | helper', function(hooks) {
  setupApplicationTest(hooks);

  test('helper works', async function(assert) {
    await visit('/');
    assert.equal(find('.global').textContent, "I'm a globally referenced helper");
    assert.equal(find('.local').textContent, "I'm a locally referenced helper");

    assert.equal(findAll('.global').length, 1);
    assert.equal(findAll('.local').length, 2);

    assert.equal(find('.complex').textContent, 'abc');

    await new Promise(res => setTimeout(res, 1500));

    assert.equal(find('.complex').textContent, 'abcd');
  });
});
