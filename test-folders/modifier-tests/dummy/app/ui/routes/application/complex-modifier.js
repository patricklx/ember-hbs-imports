import Modifier from 'ember-modifier';

export default class InvokeModifier extends Modifier {
  didInstall() {
    super.didInstall();
    this.element.textContent += this.args.positional[0];
  }
}
