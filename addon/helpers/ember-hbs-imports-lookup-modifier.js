import { getOwner } from '@ember/application';
import { helper } from '@ember/component/helper';

function lookupModifier([context, path]) {
  const m = getOwner(context).factoryFor(`modifier:${path}`);
  return m.class;
}

export default helper(lookupModifier);
