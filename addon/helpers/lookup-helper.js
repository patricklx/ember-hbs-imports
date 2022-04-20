import { getOwner } from '@ember/application';
import Helper from '@ember/component/helper';

export default Helper.extend({
  compute([context, path]) {
    return getOwner(context||this).lookup(`helper:${path}`);
  }
});
