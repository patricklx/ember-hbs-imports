"use strict";

const hbsImportsProcessor = require('../lib/import-processor');
const path = require('path');
hbsImportsProcessor.default.options.useModifierHelperHelpers = true;
hbsImportsProcessor.default.options.useSafeImports = false;
hbsImportsProcessor.default.options.useHelperWrapper = false;
hbsImportsProcessor.default.options.extendImportPathForNamedImports = false;
hbsImportsProcessor.default.options.warn = false;
hbsImportsProcessor.default.options.emitLets = false;
hbsImportsProcessor.default.options.keepImports = true;

const glimmer = require('@glimmer/syntax');


const EmberLoose = require('@glint/environment-ember-loose/glint-environment-definition').default;

exports.default = (options) => {
  const env = EmberLoose(options);
  let currentAst = null;
  let imported = null;
  const cwd = process.cwd();
  hbsImportsProcessor.default.options.root = require(path.join(cwd, 'package.json')).name;
  const cache = {};
  env.template.preprocess = (templateInfo, args) => {
    const template = templateInfo.contents;
    let relativePath = path.relative(cwd, templateInfo.filename);
    const ast = glimmer.preprocess(template);
    currentAst = ast;
    args.preamble = args.preamble || [];
    try {
      if (!relativePath || args.globals) {
        if (!args.globals) {
          delete args.globals;
        }
        return {};
      }
      relativePath = relativePath.replace(/\\/g, '/');
      hbsImportsProcessor.default.options.namespace = path.basename(cwd);
      if (relativePath.startsWith('tests/dummy/')) {
        hbsImportsProcessor.default.options.namespace = 'dummy';
      }
      imported = hbsImportsProcessor.default.replaceInAst(ast, relativePath);
      cache[relativePath] = imported;
      if ([Object.keys(imported.info.components), Object.keys(imported.info.modifiers), Object.keys(imported.info.helpers)].flat().length === 0) {
        delete args.globals;
      }

    } catch (e) {
      console.error(e);
    }

    args.meta = args.meta || {};
    const withGlobals = args.globals;
    args.withGlobals = withGlobals;
    args.globals = withGlobals || {
      includes: (v) => {
        return v.includes('::') || [
          'array',
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
          'modifier',
          'hash',
          'helper'
        ].includes(v)
      }
    };
    if (!template.match(/^{{import/) && !withGlobals) {
      delete args.globals;
    }

    return args;
  }
  env.template.postprocessAst = (ast) => {
    return currentAst;
  }

  env.template.mapTemplateContent = {
    emitMustacheStatement(original, emitters, mapper, node, ...args) {
      if (node.path?.original === 'import' && node.params.some(p => p.original === 'from')) {
        mapper.emit.forNode(node, () => {
          try {
            const matcher = (p, i) => (p.value && node.params[i].value === p.value) || (p.original && node.params[i].original === p.original);
            Object.entries(imported.info.components).filter(([tag, i]) => i.imp.node.params.every(matcher)).forEach(([tag, i]) => {
              if (i?.imp.shouldLookInFile) {
                mapper.emit.text(`const ${tag}: typeof import('${i.path}').${tag} = {} as any;`);
                mapper.emit.newline();
              } else if (i) {
                mapper.emit.text(`const ${tag}: typeof import('${i.path}').default = {} as any;`);
                mapper.emit.newline();
              }
            });


            Object.entries(imported.info.modifiers).filter(([tag, i]) => i.imp.node.params.every(matcher)).forEach(([tag, i]) => {
              if (i?.imp.shouldLookInFile) {
                mapper.emit.text(`const ${tag}: typeof import('${i.resolvedPath}').${tag} = {} as any;`);
                mapper.emit.newline();
              } else if (i) {
                mapper.emit.text(`const ${tag}: typeof import('${i.resolvedPath}').default = {} as any;`);
                mapper.emit.newline();
              }
            });

            Object.entries(imported.info.helpers).filter(([tag, i]) => i.imp.node.params.every(matcher)).forEach(([tag, i]) => {
              if (tag === 'array' && i?.resolvedPath === '@ember/helper') {
                return;
              }
              if (i?.imp.shouldLookInFile) {
                mapper.emit.text(`const ${tag}: typeof import('${i.resolvedPath}').${tag} = {} as any;`);
                mapper.emit.newline();
              } else if (i) {
                mapper.emit.text(`const ${tag}: typeof import('${i.resolvedPath}').default = {} as any;`);
                mapper.emit.newline();
              }
            });
          } catch (e) {
            console.log(e)
          }

        })
        return;
      }
      original.call(this, node, ...args);
    }
  }
  return env;
};
//# sourceMappingURL=index.js.map
