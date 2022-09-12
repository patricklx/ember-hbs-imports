import { Rule } from 'ember-template-lint';
import importProcessors from '../lib/import-processor.js';
import patch from './patch-linter.js';

patch(importProcessors)

export default class HbsImports extends Rule {
  visitor() {
    return {
      PathExpression(node) {
        const e = importProcessors.default.errors.find(e => e.node.loc === node.loc);
        if (!e) return;
        // @ts-ignore
        this.log({
          message: e.msg.message,
          node,
        });
      }
    };
  }
}
