import * as glimmer from '@glimmer/syntax';
import { hash } from 'spark-md5';
import path from 'path';
import { NodeVisitor, WalkerPath } from '@glimmer/syntax';
import { BlockStatement, Block, ElementNode, SubExpression, PathExpression } from '@glimmer/syntax/dist/types/lib/v1/nodes-v1';

function generateScopedName(name, fullPath, namespace) {
  fullPath = fullPath.replace(/\\/g, '/');
  const prefix = fullPath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${hash(hashKey).slice(0, 5)}`;
}

type Import = {
  isStyle?: boolean;
  used?: boolean;
  node: glimmer.AST.MustacheStatement;
  dynamic?: boolean;
  localName: string;
  importPath: string;
  isLocalNameValid: boolean;
  shouldLookInFile: boolean;
};

const builtInComponents = ['LinkTo'];
const builtInHelpers = [
  '-get-dynamic-var',
  '-element',
  '-lf-get-outlet-state',
  '-in-element',
  'in-element',
  '-with-dynamic-vars',
  'action',
  'array',
  'component',
  'concat',
  'debugger',
  'each',
  'each-in',
  'fn',
  'get',
  'has-block',
  'has-block-params',
  'hasBlock',
  'hasBlockParams',
  'hash',
  'if',
  'input',
  'let',
  'link-to',
  'loc',
  'log',
  'mount',
  'mut',
  'on',
  'outlet',
  'partial',
  'query-params',
  'readonly',
  'textarea',
  'unbound',
  'unless',
  'with',
  'yield',
];

type Msg = {

};

const importProcessors = {
  errors: [] as {node: Node, msg: Msg}[],
  cacheOffset: {},
  options: {} as any,
  defaultOptions: {
    styleExtension: 'scss',
    root: '',
    warn: true,
    namespace: '',
    emitLets: true,
    failOnBadImport: false,
    failOnMissingImport: false,
    useModifierHelperHelpers: false,
    useHelperWrapper: true,
    useSafeImports: true,
    extendImportPathForNamedImports: true,
    messageFormat: 'json'
  },
  glimmer,
  resolvePath(imp: Import, name: string) {
    name = name.replace('imported_', '')
    if (name.includes('.') && !imp.importPath.endsWith(`.${this.options.styleExtension}`)) {
      name = name.split('.').slice(1).join('/');
      return `${imp.importPath}/${name}`;
    }
    return imp.importPath;
  },
  parseImports(body, relativePath) {
    const imports: Import[] = [];
    body.forEach((node) => {
      const isImportPath = node.path && node.path.type === 'PathExpression' && node.path.original === 'import';
      if (isImportPath) {
        const params = node.params.map(p => p.original);
        const localName = params.slice(0, -2).join(' ');
        let importPath = params.slice(-1)[0];
        if (importPath.startsWith('~/')) {
          importPath = importPath.replace('~/', this.options.namespace + '/');
        }
        if (importPath.startsWith('ui/') || importPath === 'ui') {
          importPath = importPath.replace(/^ui\//, this.options.namespace + '/ui/');
          importPath = importPath.replace(/^ui$/, this.options.namespace + '/ui');
        }
        if (importPath.startsWith('.')) {
          relativePath = relativePath.replace(/^app\//, this.options.root + '/');
          relativePath = relativePath.replace(/^addon\//, this.options.root + '/');
          relativePath = relativePath.replace(/^src\//, this.options.root + '/');
          importPath = path.join(path.dirname(relativePath), importPath).split(path.sep).join('/');
          importPath = importPath.replace('node_modules/', '');
        }
        const shouldLookInFile = localName.includes('{') && localName.includes('}');
        const hasMultiple = localName.includes(',') || localName.includes(' as ') || shouldLookInFile;
        const localNames = localName.replace(/['"{}]/g, '').split(',');
        localNames.forEach((lName) => {
          lName = lName.trim();
          let importName = lName;
          if (lName.includes(' as ')) {
            [importName, lName] = lName.split(' as ');
            importName = importName.trim();
            lName = lName.trim();
          }
          if (importName === '*') {
            const name = `${lName}\\.([^\\s\\)} |]+)`;
            imports.push({
              node,
              dynamic: true,
              localName: name,
              importPath: importPath,
              isLocalNameValid: true,
              shouldLookInFile
            });
            return;
          }
          imports.push({
            isStyle: importPath.endsWith('.scss'),
            node,
            localName: lName,
            importPath: importPath + (((hasMultiple || shouldLookInFile) && this.options.extendImportPathForNamedImports) ? (`/${importName}`) : ''),
            isLocalNameValid: true,
            shouldLookInFile
          });
        });
      }
    });
    return imports;
  },

  replaceInAst(ast: glimmer.ASTv1.Template, relativePath: string) {
    this.errors = [];
    this.options = Object.assign({}, this.defaultOptions, this.options);
    const imported = {
      components: new Set<string>(),
      helpers: new Set<string>(),
      modifiers: new Set<string>(),
      others: new Set<string>(),
      info: {
        components: {} as {[x:string]: {path: string, imp: Import}},
        helpers: {} as {[x:string]: {nodes: PathExpression[], resolvedPath: string, imp: Import}},
        modifiers: {} as {[x:string]: {nodes: PathExpression[], resolvedPath: string, imp: Import}}
      }
    }
    const imports = this.parseImports(ast.body, relativePath);
    if (!imports.length) return imported;

    imports.forEach((imp) => {
      const index = ast.body.indexOf(imp.node as any);
      if (index >= 0) {
        ast.body.splice(index, 1);
      }
    });
    const components = imported.info.components;
    const helpers = imported.info.helpers;
    const modifiers = imported.info.modifiers;
    function findImport(name: string) {
      return imports.find((imp) => {
        if (imp.isStyle) {
          return name.split('.')[0] === imp.localName;
        }
        if (imp.dynamic) {
          const re = new RegExp(imp.localName);
          return re.test(name);
        }
        return name === imp.localName;
      });
    }

    const findBlockParams = function(expression: string, p: WalkerPath<BlockStatement|Block|ElementNode|PathExpression>) {
      if (p.node && p.node.type === 'BlockStatement' && p.node.program.blockParams.includes(expression)) {
        return true;
      }
      const node = p.node as any;
      if (node && node.blockParams && node.blockParams.includes(expression)) {
        return true;
      }
      if (!p.parent) return null;
      return findBlockParams(expression, p.parent as any);
    };

    const visitor: NodeVisitor = {
      PathExpression: (node, p) => {
        if (node.original === 'this' || node.original.startsWith('this.') || node.original.startsWith('@')) return;
        if (node.original === 'block') return;
        if (findBlockParams(node.original.split('.')[0], p)) return;
        const i = findImport(node.original);
        if (!i && !builtInHelpers.includes(node.original)) {
          if (p.parentNode?.type === 'ElementModifierStatement') return;
          if (!this.options.failOnBadImport) {
            generateErrorMessage(this.options, relativePath, 'could not find import for ' + node.original, node);
          }
          else {
            throw new Error(`modifier ${node.original} is not imported`);
          }
        }
        if (i) {
          const resolvedPath = importProcessors.resolvePath(i, node.original);
          if (i.isStyle) {
            const name = node.original.split('.').slice(1).join('_');
            node.type = 'StringLiteral' as any;
            node.loc = i.node.params[2].loc;
            delete (node as any).parts;
            node.original = generateScopedName(name, resolvedPath, this.options.namespace);
            (node as any).value = generateScopedName(name, resolvedPath, this.options.namespace);
            i.used = true;
            imported.others.add(resolvedPath);
            return;
          }
          if (node.original.includes('.')) {
            node.original = node.original.replace(/\./g, '_sep_');
          }
          const firstLetter = node.original.replace('imported_', '').split('_sep_').slice(-1)[0][0];
          if (this.options.useSafeImports && !node.original.startsWith('imported_')) {
            node.original = 'imported_' + node.original;
          }
          if (firstLetter === firstLetter.toUpperCase()) {
            if (this.options.useSafeImports && !node.original.startsWith('imported_')) {
              node.original = 'Imported_' + node.original;
            }
            if (node.parts) {
              node.parts[0] = node.original;
            }
            imported.components.add(resolvedPath);
            components[node.original] = {
              path: resolvedPath,
              imp: i
            };
            i.used = true;
            return;
          }
          if (modifiers[node.original]) {
            i.used = true;
            return;
          }
          // its a helper
          if (this.options.useSafeImports && !node.original.startsWith('imported_')) {
            node.original = 'imported_' + node.original;
          }
          node.original = node.original.replace(/-/g, '_');
          if (node.parts) {
            node.parts[0] = node.original;
          }
          imported.others.add(resolvedPath + '.js');
          helpers[node.original] = helpers[node.original] || { nodes: [], resolvedPath, imp: i };
          helpers[node.original].nodes.push(node);
          i.used = true;
        }
      },
      ElementNode: (element, p: WalkerPath<ElementNode>) => {
        element.modifiers.forEach((modifier) => {
          const p = modifier.path as any;
          const i = findImport(p.original);
          if (!i) {
            if (builtInHelpers.includes(p.original)) return;
            if (!this.options.failOnBadImport) {
              generateErrorMessage(this.options, relativePath, `modifier ${p.original} is not imported`, p);
            }
            else {
              throw new Error(`modifier ${p.original} is not imported`);
            }
            return;
          }

          const resolvedPath = importProcessors.resolvePath(i, p.original);
          if (p.original.includes('.')) {
            p.original = p.original.replace(/\./g, '_sep_');
          }
          p.original = p.original.replace(/-/g, '_');
          if (this.options.useSafeImports && !p.original.startsWith('imported_')) {
            p.original = 'imported_' + p.original;
            if (p.parts) {
              p.parts[0] = p.original;
            }
          }
          modifiers[p.original] = modifiers[p.original] || { resolvedPath, nodes: [], imp: i };
          modifiers[p.original].nodes.push(p);
          imported.others.add(resolvedPath + '.js');
          i.used = true;
        });

        if (element.tag.startsWith(':')) return ;
        if (element.tag.includes('::')) return ;
        const imp = findImport(element.tag.split('.')[0]);
        if (findBlockParams(element.tag.split('.')[0], p))
          return;
        if (builtInComponents.includes(element.tag))
          return;
        if (!imp) {
          if (element.tag.split('.').slice(-1)[0][0] !== element.tag.split('.').slice(-1)[0][0].toUpperCase())
            return;
          if (this.options.failOnMissingImport) {
            throw new Error('could not find import for element ' + element.tag + ' in ' + relativePath);
          }
          else {
            generateErrorMessage(this.options, relativePath, 'could not find import for element ' + element.tag, element);
          }
          return;
        }
        if (imp) {
          const resolvedPath = importProcessors.resolvePath(imp, element.tag);
          if (element.tag.includes('.')) {
            element.tag = element.tag.replace(/\./g, '_sep_');
          }
          if (this.options.useSafeImports && !element.tag.startsWith('Imported_')) {
            element.tag = 'Imported_' + element.tag;
          }
          imported.components.add(resolvedPath);
          components[element.tag] = {
            path: resolvedPath,
            imp: imp
          };
        }
      }
    };
    glimmer.traverse(ast, visitor);

    if (!this.options.emitLets) {
      return imported;
    }

    const createComponentLetBlockExpr = (comp: [key: string, info: {path: string}]) => {
      return importProcessors.glimmer.preprocess(`{{#let (component "${comp[1].path}") as |${comp[0]}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
    };
    const handleHelper = (helper: { nodes: PathExpression[], resolvedPath: string }) => {
      if (this.options.useModifierHelperHelpers) {
        let lookup =  `"${helper.resolvedPath}"`;
        if (this.options.useHelperWrapper) {
          lookup = `(ember-hbs-imports/helpers/lookup-helper this "${helper.resolvedPath}")`;
        }
        return importProcessors.glimmer.preprocess(`{{#let (helper ${lookup}) as |${helper.nodes[0].original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
      } else {
        helper.nodes.forEach(node => {
          node.original = `ember-hbs-imports/helpers/invoke-helper this '${helper.resolvedPath}'`;
        });
      }
    };
    const handleModifier = (modifier: { nodes: PathExpression[], resolvedPath: string }) => {
      if (this.options.useModifierHelperHelpers) {
        let lookup =  `"${modifier.resolvedPath}"`;
        if (this.options.useHelperWrapper) {
          lookup = `(ember-hbs-imports/helpers/lookup-modifier this "${modifier.resolvedPath}")`;
        }
        return importProcessors.glimmer.preprocess(`{{#let (modifier ${lookup}) as |${modifier.nodes[0].original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
      } else {
        modifier.nodes.forEach(node => {
          node.original = modifier.resolvedPath;
        });
      }
    };

    let body: glimmer.AST.Statement[] = [];
    const root = body;
    const baseLoc = {
      start: ast.body[0].loc.start,
      end: ast.body.slice(-1)[0].loc.end
    }
    Object.entries(components).forEach((c) => {
      const letComponent = createComponentLetBlockExpr(c);
      const i = c[1].imp;
      const node = i.node.params[2];
      (letComponent.params[0] as SubExpression).params[0].loc = node.loc;
      body.push(letComponent);
      body = letComponent.program.body;
      Object.assign(letComponent.loc, baseLoc);
    });
    Object.values(helpers).forEach((c) => {
      const letHelper = handleHelper(c);
      if (!letHelper) return;
      const i = c.imp;
      const node = i.node.params[2];
      (letHelper.params[0] as SubExpression).params[0].loc = node.loc;
      body.push(letHelper);
      body = letHelper.program.body;
      Object.assign(letHelper.loc, baseLoc);
    });
    Object.values(modifiers).forEach((c) => {
      const letModifier = handleModifier(c);
      if (!letModifier) return;
      const i = c.imp;
      const node = i.node.params[2];
      (letModifier.params[0] as SubExpression).params[0].loc = node.loc;
      body.push(letModifier);
      body = letModifier.program.body;
      Object.assign(letModifier.loc, baseLoc);
    });
    body.push(...ast.body);
    ast.body = root;
    return imported;
  },

  processAst(contents, relativePath) {
    const ast = glimmer.preprocess(contents);
    const imported = this.replaceInAst(ast, relativePath);
    return [glimmer.print(ast), imported] as [string, ReturnType<typeof importProcessors['replaceInAst']>];
  }
};

function generateErrorMessage(options, path, message, node) {
  const msg: Msg = {
    'rule': 'hbs-imports',
    severity: 2,
    filePath: path,
    'line': node.loc.start.line,
    'column': node.loc.start.column,
    'endLine': node.loc.end.line,
    'endColumn': node.loc.end.column,
    'source': 'Show more icon',
    'message': message
  };
  importProcessors.errors.push({ node, msg });
  if (options.messageFormat === 'json' && options.warn) {
    console.log(JSON.stringify(msg, null, 2));
  }
}
export default importProcessors;
