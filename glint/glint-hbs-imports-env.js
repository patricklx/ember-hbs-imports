const path = require('path');
const rewriteModule = Object.entries(require.cache).find(([k, v]) => k.includes('@glint\\transform\\lib\\template\\rewrite-module'))?.[1].exports;
const fn = rewriteModule.rewriteModule;
let relativePath = null;
let currentTemplate = null;
const cwd = process.cwd();

function hbsImportsRewriteModule(ts, { script, template }, environment) {
  if (template?.filename) {
    relativePath = path.relative(cwd, template.filename);
  } else {
    relativePath = null;
  }

  currentTemplate = template;
  return fn(ts, { script, template }, environment);
}
rewriteModule.rewriteModule = hbsImportsRewriteModule;

const glimmerPath = require.resolve('@glimmer/syntax', { paths: ['node_modules/@glint/transform/node_modules', 'node_modules'] });
const glimmerTokenizer = require(path.join(glimmerPath.replace('index.js', ''), '/lib/parser/tokenizer-event-handlers'));
const glimmer = require('@glimmer/syntax');
const preprocess = glimmerTokenizer.preprocess;

let transformArgs = null;
const cache = {};

const hbsImportsProcessor = require('ember-hbs-imports/lib/import-processor')
hbsImportsProcessor.default.options.useModifierHelperHelpers = true;
hbsImportsProcessor.default.options.useSafeImports = false;
hbsImportsProcessor.default.options.useHelperWrapper = false;
hbsImportsProcessor.default.options.extendImportPathForNamedImports = false;
hbsImportsProcessor.default.options.warn = false;
hbsImportsProcessor.default.options.root = require(path.join(process.cwd(), './package.json')).name;
hbsImportsProcessor.default.options.emitLets = false;
const hbsImportPreprocess = function(template) {
  const ast = preprocess(template);
  try {
    if (!relativePath) {
      delete transformArgs?.globals;
      return ast;
    }
    relativePath = relativePath.replace(/\\/g, '/');
    const imported = hbsImportsProcessor.default.replaceInAst(ast, relativePath);
    cache[relativePath] = imported;
    if ([Object.keys(imported.info.components), Object.keys(imported.info.modifiers), Object.keys(imported.info.helpers)].flat().length === 0) {
      delete transformArgs?.globals;
    }
    const preamble = transformArgs.preamble;
    Object.entries(imported.info.components).forEach(([tag, i]) => {
      if (i.imp.shouldLookInFile) {
        preamble.push(`const ${tag}: typeof import('${i.path}').${tag} = {} as any;`);
      } else {
        preamble.push(`const ${tag}: typeof import('${i.path}').default = {} as any;`);
      }
    });
    Object.entries(imported.info.modifiers).forEach(([tag, i]) => {
      if (i.imp.shouldLookInFile) {
        preamble.push(`const ${tag}: typeof import('${i.resolvedPath}').${tag} = {} as any;\n`);
      } else {
        preamble.push(`const ${tag}: typeof import('${i.resolvedPath}').default = {} as any;\n`);
      }
    });
    Object.entries(imported.info.helpers).forEach(([tag, i]) => {
      if (i.imp.shouldLookInFile) {
        preamble.push(`const ${tag}: typeof import('${i.resolvedPath}').${tag} = {} as any;\n`);
      } else {
        preamble.push(`const ${tag}: typeof import('${i.resolvedPath}').default = {} as any;\n`);
      }
    });
    // currentTemplate.content = glimmer.print(ast);
  } catch (e) {
    console.error(e);
  }

  return ast;
}
glimmerTokenizer.preprocess = hbsImportPreprocess;
// patch glint to support ember-hbs-imports

const looseEnv = require('@glint/environment-ember-loose/-private/environment/index');
module.exports = looseEnv;


const glintTransform =  Object.entries(require.cache).find(([k, v]) => k.includes('@glint\\transform\\lib\\template\\transformed-module'))?.[1].exports;
const getOriginalRange = glintTransform.default.prototype.getOriginalRange;
glintTransform.default.prototype.getOriginalRange = function(...args) {
  const r = getOriginalRange.call(this, ...args);
  r.start = Math.max(r.start, 0);
  return r;
}


const templateToTypescript = Object.entries(require.cache).find(([k, v]) => k.includes('@glint\\transform\\lib\\template\\template-to-typescript'))?.[1].exports;
const templateToTypescriptFn = templateToTypescript.templateToTypescript;
const patchedTemplateToTypescript = function (template, args) {
  args.meta = args.meta || {};
  args.globals = [
    'action',
    'component',
    'debugger',
    'each',
    'each-in',
    'has-block',
    'has-block-params',
    'if',
    'in-element',
    'let',
    'log',
    'mount',
    'mut',
    'outlet',
    'unbound',
    'unless',
    'with',
    'yield',
  ];
  args.preamble = args.preamble  || [];
  transformArgs = args;
  if (!template.match(/^{{import/)) {
    delete args.globals;
  }
  return templateToTypescriptFn.call(this, template, args);
}
templateToTypescript.templateToTypescript = patchedTemplateToTypescript;


const transformManager = Object.entries(require.cache).find(([k, v]) => k.includes('@glint\\core\\lib\\common\\transform-manager'))?.[1].exports;
const rewriteDiagnostics = transformManager.default.prototype.rewriteDiagnostics;
const util = require('@glint/core/lib/language-server/util');
const patchedRewriteDiagnostics = function (diagnostics, fileName) {
  console.error('patchedRewriteDiagnostics');
  const diags = rewriteDiagnostics.call(this, diagnostics, fileName);
  diags.forEach((d) => {
    const regexs = [
      /Cannot find module '(.*)' or its corresponding type declarations./,
      /Namespace '(.*)' has no exported member/
    ];
    const result = regexs.map(r => d.messageText.match?.(r)).find(r => r && result.length > 1)
    if (result && result.length > 1) {
      const importPath = result[1];
      const rel = path.relative(cwd, d.file.fileName).replace(/\\/g, '/');
      const c = Object.values(cache[rel].info.components).find(x => x.imp.importPath === importPath) ||
        Object.values(cache[rel].info.helpers).find(x => x.imp.importPath === importPath) ||
        Object.values(cache[rel].info.modifiers).find(x => x.imp.importPath === importPath);
      if (c) {
        d.start = util.positionToOffset(d.file.text, { line: c.imp.node.params[2].loc.start.line-1, character: c.imp.node.params[2].loc.start.column });
        const end = util.positionToOffset(d.file.text, { line: c.imp.node.params[2].loc.end.line-1, character: c.imp.node.params[2].loc.end.column })
        d.length = end - d.start;
      }
    }
  })
  return diags;
}
transformManager.default.prototype.rewriteDiagnostics = patchedRewriteDiagnostics;
