const path = require("path");

const index = process.argv.indexOf('--filename')

const glimmerPath = require.resolve('@glimmer/syntax', { paths: [path.join(process.cwd(),'node_modules/ember-template-recast/node_modules'), 'node_modules'] });
const glimmer = require(path.join(glimmerPath.replace('index.js', ''), '/lib/parser/tokenizer-event-handlers'));
const preprocess = glimmer.preprocess;

module.exports = function(hbsImportsProcessor) {
  const hbsImportPreprocess = function(template, opts) {
    const ast = preprocess(template, opts);
    const isFixMode = process.env.emberTemplateLintFixMode === "true" || process.argv.indexOf('--fix') !== -1
    let relativePath = process.env.emberTemplateLintFileName || process.argv[index + 1];
    if (isFixMode) {
      return ast;
    }
    hbsImportsProcessor.default.options.root = require(path.join(process.cwd(), 'package.json')).name;
    hbsImportsProcessor.default.options.useModifierHelperHelpers = true;
    hbsImportsProcessor.default.options.useSafeImports = false;
    hbsImportsProcessor.default.options.useHelperWrapper = false;
    hbsImportsProcessor.default.options.warn = false;
    hbsImportsProcessor.default.replaceInAst(ast, relativePath);
    return ast;
  }
  glimmer.preprocess = hbsImportPreprocess;
}
