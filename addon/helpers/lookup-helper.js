import { getOwner } from '@ember/application';
import Helper from '@ember/component/helper';

export default Helper.extend({
  compute([context, path]) {
    const h = getOwner(context||this).lookup(`helper:${path}`);
    if (!h) {
      throw new Error('could not find helper: ' + path);
    }
    return h;
  }
});
