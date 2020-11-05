import { modifier } from 'ember-modifier';

/**
 *
 * @param element {Element}
 * @param positional
 * @param named
 * @returns {*}
 * @private
 */
function _default(element, positional) {
  return element.textContent += positional[0];
}

export default modifier(_default);
