import rule from './template-lint/rule.mjs';

export default {
  // Name of plugin
  name: 'hbs-imports-rule',

  // Define rules for this plugin. Each path should map to a plugin rule
  rules: {
    'must-have-hbs-imports': rule
  }
}
