import { helper as buildHelper } from '@ember/component/helper';

function _default([text]) {
  return text + 1;
}

function _default2([text]) {
  return text + 2;
}

export const helper1 = buildHelper(_default);
export const helper2 = buildHelper(_default2);
export default helper1;
