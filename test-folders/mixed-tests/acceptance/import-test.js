import { module, test } from 'qunit';
import { visit, find, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | import', function(hooks) {
  setupApplicationTest(hooks);

  test('Import works', async function(assert) {
    await visit('/');
    assert.ok(find('.global-button').innerText.includes('I\'m a globally referenced button'));
    console.log(find('.global-button'));
    const dummycss = Array.from(document.styleSheets).find(s => s.href.endsWith('dummy.css'));
    const rule = Array.from(dummycss.rules).find(r => r.selectorText === '.' + find('.global-button').classList[1]);
    assert.ok(rule, find('.global-button').classList[1] + ' exists in stylesheets');

    assert.equal(findAll('.local').length, 1);
    assert.equal(find('.modifiers').innerText, 'modifier', find('.modifiers').innerText);
    assert.equal(find('.style').innerText, find('.style').classList[1], find('.style').innerText);
  });
});
