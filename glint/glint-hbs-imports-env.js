const path = require('path');
const rewriteModule = require('@glint/transform/lib/template/rewrite-module');
const fn = rewriteModule.rewriteModule;
let relativePath = null;
rewriteModule.rewriteModule = function hbsImportsRewriteModule(ts, { script, template }, environment) {
  const cwd = process.cwd();
  relativePath = path.relative(cwd, template.filename);
  return fn(ts, { script, template }, environment);
}

const glimmerPath = require.resolve('@glimmer/syntax', {paths: ["node_modules/@glint/transform/node_modules", "node_modules"]});
const glimmer = require(path.join(glimmerPath.replace('index.js', ''), '/lib/parser/tokenizer-event-handlers'));
const preprocess = glimmer.preprocess;

const hbsImportsProcessor = require('ember-hbs-imports/lib/import-processor')
const hbsImportPreprocess = function (template) {
  const ast = preprocess(template);
  hbsImportsProcessor.default.replaceInAst(ast, relativePath);
  return ast;
}
glimmer.preprocess = hbsImportPreprocess;
// patch glint to support ember-hbs-imports

const looseEnv = require('@glint/environment-ember-loose/-private/environment/index');
module.exports = looseEnv;
