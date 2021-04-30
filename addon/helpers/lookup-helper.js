import { getOwner } from '@ember/application';
import { helper } from '@ember/component/helper';

function lookupHelper([context, path]) {
  return getOwner(context).lookup(`helper:${path}`);
}

export default helper(lookupHelper);
