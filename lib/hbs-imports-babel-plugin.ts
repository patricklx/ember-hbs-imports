import ImportProcessor from './import-processor';
import p from 'path';
import type * as BabelCoreNamespace from '@babel/core';
import type * as BabelTypesNamespace from '@babel/types';
import type { NodePath } from '@babel/traverse';
import { PluginObj } from '@babel/core';
import { V8IntrinsicIdentifier } from '@babel/types';

export type Babel = typeof BabelCoreNamespace;
export type BabelTypes = typeof BabelTypesNamespace;

module.exports = function hbsImports({ types: t }: { types: BabelTypes}) {
  let allImports;
  let isTemplateImports;
  let relativePath;
  return {
    name: 'hbs-imports',
    visitor: {
      Program: {
        enter(path, state) {
          allImports = null;
          isTemplateImports = null;
          let cwd = process.cwd();
          ImportProcessor.options = Object.assign({}, state.opts);
          // @ts-ignore
          const fileName = path.hub.file.opts.filename;
          if (!fileName) return;
          if (fileName.includes('embroider')) {
            const parts = fileName.split('/');
            const index = parts.indexOf('embroider');
            cwd = parts.slice(0, index + 2).join('/');
          }
          ImportProcessor.options.root = cwd;
          relativePath = p.relative(ImportProcessor.options.root, fileName);
        },
        exit(path, state) {
          // @ts-ignore
          const fileName = path.hub.file.opts.filename;
          if (!fileName) return;
          const importedStyles = allImports && [...allImports.others]
            .filter(x => x.endsWith('.scss'))
            .map(x => x.replace(new RegExp('^'+ImportProcessor.options.namespace + '\/'), ''))
            .map(x => p.relative(p.dirname(fileName), p.join(ImportProcessor.options.root, x)))
            .map(x => x.startsWith('.') ? x : `./${x}`);
          importedStyles?.forEach((s) => {
            const newImport = t.importDeclaration([], t.stringLiteral(s));
            path.node.body.unshift(newImport);
          });
        }
      },
      ImportDeclaration(path) {
        if (path.node.source.value === 'ember-template-imports') {
          isTemplateImports = true;
        }
      },
      CallExpression(path) {
        const call = path.node;
        if (isTemplateImports) return;
        if ((call.callee as V8IntrinsicIdentifier).name === 'precompileTemplate' && call.arguments[0].type === 'StringLiteral') {
          const [content, imported] = ImportProcessor.processAst(call.arguments[0].value, relativePath);
          allImports = imported;
          call.arguments[0].value = content;
        }
      }
    }
  } as PluginObj;
}
