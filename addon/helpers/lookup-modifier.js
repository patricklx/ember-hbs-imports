import { getOwner } from '@ember/application';
import Helper from '@ember/component/helper';

export default Helper.extend({
  compute([context, path]) {
    const m = getOwner(context||this).factoryFor(`modifier:${path}`)?.class;
    if (!m) {
      throw new Error('could not find modifier: ' + path);
    }
    return m;
  }
});

