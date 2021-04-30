import Helper from '@ember/component/helper';
import { later } from '@ember/runloop';


export default class ComplexHelper extends Helper {
  text = 'abc';
  compute(params, hash) {
    if (this.text === 'abc') {
      setTimeout(() => {
        later(() => {
          this.text += 'd';
          this.recompute();
        }, 5);
      }, 1000);
    }
    return this.text;
  }
}
ComplexHelper.class = ComplexHelper;
