const path = require("path");
const fs = require("fs");

const index = process.argv.indexOf('--filename')

const lookupPaths = [
  'node_modules/ember-template-recast/node_modules',
  'node_modules'
]

if (fs.existsSync("node_modules/.pnpm")) {
  const entries = fs.readdirSync("node_modules/.pnpm");
  const recast = entries.find(d => d.startsWith('ember-template-recast'));
  if (recast) {
    lookupPaths.push(path.join("node_modules/.pnpm", recast, "node_modules"));
  }
}

const glimmerPath = require.resolve('@glimmer/syntax', { paths: lookupPaths });
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
