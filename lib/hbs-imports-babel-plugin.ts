const ImportProcessor = require('ember-hbs-imports/lib/import-processor');
const p = require('path');
const fs = require('fs');

console.log('loading hbs-imports-babel-plugin.js');

module.exports = function hbsImports({ types: t }) {
  console.log('hbsImports');
  let allImports;
  let isTemplateImports;
  let relativePath;
  return {
    name: 'hbs-imports',
    visitor: {
      /**
       *
       * @param path {NodePath}
       * @constructor
       */
      Program: {
        enter(path, state) {
          allImports = null;
          isTemplateImports = null;
          let cwd = process.cwd();
          ImportProcessor.default.options = Object.assign({}, state.opts);
          const fileName = path.hub.file.opts.filename;
          if (fileName.includes('embroider')) {
            const parts = fileName.split('/');
            const index = parts.indexOf('embroider');
            cwd = parts.slice(0, index + 2).join('/');
          }
          ImportProcessor.default.options.root = cwd;
          relativePath = p.relative(ImportProcessor.default.options.root, fileName);
        },
        exit(path, state) {
          const cwd = ImportProcessor.default.options.root;
          const fileName = path.hub.file.opts.filename;
          const importedStyles = allImports && [...allImports.others]
            .filter(x => x.endsWith('.scss'))
            .map(x => x.replace(new RegExp('^'+ImportProcessor.default.options.namespace + '\/'), ''))
            .map(x => p.relative(p.dirname(fileName), p.join(cwd, x)))
            .map(x => x.startsWith('.') ? x : `./${x}`);
          importedStyles?.forEach((s) => {
            const newImport = t.importDeclaration([], t.stringLiteral(s));
            path.node.body.unshift(newImport);
          });
          const paths = new Set();
          if (allImports) {
            Object.values(allImports.info.components).forEach((comp) => {
              let path = comp.path;
              if (comp.imp.shouldLookInFile) {
                path = comp.imp.importPath.split('/').slice(0, -1).join('/');
              }
              paths.add(path);
            });
            Object.values(allImports.info.helpers).forEach((comp) => {
              let path = comp.resolvedPath;
              if (comp.imp.shouldLookInFile) {
                path = comp.imp.importPath.split('/').slice(0, -1).join('/');
              }
              paths.add(path);
            });
            Object.values(allImports.info.modifiers).forEach((comp) => {
              let path = comp.resolvedPath;
              if (comp.imp.shouldLookInFile) {
                path = comp.imp.importPath.split('/').slice(0, -1).join('/');
              }
              paths.add(path);
            });
          }
          const namespaced = new RegExp('^'+ImportProcessor.default.options.namespace + '\/');
          [...paths]
            .map(x => {
              if (x.startsWith('.')) {
                x = p.relative(p.dirname(fileName), p.join(cwd, x));
                x = x.startsWith('.') ? x : `./${x}`;
              }
              if (x.startsWith(ImportProcessor.default.options.namespace + '/')) {
                x = x.replace(namespaced, '');
                x = p.relative(p.dirname(fileName), p.join(cwd, x));
                x = x.startsWith('.') ? x : `./${x}`;
              }
              return x;
            })
            .forEach((s) => {
              const newImport = t.importDeclaration([], t.stringLiteral(s));
              path.node.body.unshift(newImport);
            })
        }
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value === 'ember-template-imports') {
          isTemplateImports = true;
        }
      },
      CallExpression(path, state) {
        const call = path.node;
        if (isTemplateImports) return;
        if (call.callee.name === 'precompileTemplate') {
          const [content, imported] = ImportProcessor.default.processAst(call.arguments[0].value, relativePath);
          allImports = imported;
          call.arguments[0].value = content;
        }
      }
    }
  };
}
