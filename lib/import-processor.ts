import * as glimmer from '@glimmer/syntax';
import { hash } from 'spark-md5';
import path from 'path';
import { NodeVisitor, Path } from '@glimmer/syntax';
import { Block, BlockStatement, ElementNode, PathExpression } from '@glimmer/syntax/dist/types/lib/types/nodes';

function generateScopedName(name, fullPath, namespace) {
  fullPath = fullPath.replace(/\\/g, '/');
  const prefix = fullPath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${hash(hashKey).slice(0, 5)}`;
}

type Import = {
  isStyle?: boolean;
  used?: boolean;
  node: glimmer.AST.Node;
  dynamic?: boolean;
  localName: string;
  importPath: string;
  isLocalNameValid: boolean;
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

const importProcessors = {
  options: {
    styleExtension: 'scss',
    root: '',
    namespace: '',
    failOnBadImport: false,
    failOnMissingImport: false,
    useModifierHelperHelpers: false
  },
  glimmer,
  resolvePath(imp, name) {
    name = name.replace('_imported', '')
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
          importPath = path.join(path.dirname(relativePath), importPath).split(path.sep).join('/');
          importPath = importPath.replace('node_modules/', '');
        }
        const hasMultiple = localName.includes(',') || localName.includes(' as ');
        const localNames = localName.replace(/['"]/g, '').split(',');
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
              node, dynamic: true, localName: name, importPath: importPath, isLocalNameValid: true
            });
            return;
          }
          imports.push({
            isStyle: importPath.endsWith('.scss'),
            node,
            localName: lName,
            importPath: importPath + (hasMultiple ? (`/${importName}`) : ''),
            isLocalNameValid: true
          });
        });
      }
    });
    return imports;
  },

  replaceInAst(ast: glimmer.AST.Template, relativePath: string) {
    const imported = {
      components: new Set<string>(),
      helpers: new Set<string>(),
      modifiers: new Set<string>(),
      others: new Set<string>()
    }
    const imports = this.parseImports(ast.body, relativePath);
    if (!imports.length) return imported;

    imports.forEach((imp) => {
      const index = ast.body.indexOf(imp.node as any);
      if (index >= 0) {
        ast.body.splice(index, 1);
      }
    });
    const components: {[x:string]: string} = {};
    const helpers: {[x:string]: {nodes: PathExpression[], resolvedPath: string}} = {};
    const modifiers: {[x:string]: {nodes: PathExpression[], resolvedPath: string}} = {};
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

    const findBlockParams = function(expression: string, p: Path<BlockStatement|ElementNode|Block|PathExpression>) {
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
        }
        if (i) {
          const resolvedPath = importProcessors.resolvePath(i, node.original);
          if (i.isStyle) {
            const name = node.original.split('.').slice(1).join('_');
            node.type = 'StringLiteral' as any;
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
          if (!node.original.startsWith('imported_')) {
            node.original = 'imported_' + node.original;
          }

          const firstLetter = node.original.split('_sep_').slice(-1)[0][0];
          if (firstLetter === firstLetter.toUpperCase()) {
            imported.components.add(resolvedPath);
            components[node.original] = resolvedPath;
            i.used = true;
            return;
          }
          if (modifiers[node.original]) {
            i.used = true;
            return;
          }
          // its a helper
          imported.others.add(resolvedPath + '.js');
          helpers[node.original] = helpers[node.original] || { nodes: [], resolvedPath };
          helpers[node.original].nodes.push(node);
          i.used = true;
        }
      },
      ElementNode: (element, p: Path<ElementNode>) => {
        element.modifiers.forEach((modifier) => {
          const p = modifier.path as any;
          const i = findImport(p.original);
          if (!i) {
            if (!this.options.failOnBadImport) {
              console.warn('modifier', p.original, 'is not imported');
            } else {
              throw new Error(`modifier ${p.original} is not imported`);
            }
            return;
          }

          const resolvedPath = importProcessors.resolvePath(i, p.original);
          if (p.original.includes('.')) {
            p.original = p.original.replace(/\./g, '_sep_');
          }
          if (!p.original.startsWith('imported_')) {
            p.original = 'imported_' + p.original;
          }
          modifiers[p.original] = modifiers[p.original] || { resolvedPath, nodes: [] };
          modifiers[p.original].nodes.push(p);
          imported.others.add(resolvedPath + '.js');
          i.used = true;
        });

        if (element.tag.startsWith(':')) return ;
        if (element.tag.includes('::')) return ;
        const imp = findImport(element.tag.split('.')[0]);
        if (findBlockParams(element.tag.split('.')[0], p)) return;
        if (builtInComponents.includes(element.tag)) return;
        if (!imp) {
          if (element.tag.split('.').slice(-1)[0][0] !== element.tag.split('.').slice(-1)[0][0].toUpperCase()) return ;
          if (this.options.failOnMissingImport) {
            throw new Error('could not find import for element ' + element.tag + ' in ' + relativePath);
          } else {
            console.log('warn', 'could not find import for element ' + element.tag + ' in ' + relativePath);
            return;
          }
        }
        if (imp) {
          const resolvedPath = importProcessors.resolvePath(imp, element.tag);
          if (element.tag.includes('.')) {
            element.tag = element.tag.replace(/\./g, '_sep_');
          }
          if (!element.tag.startsWith('imported_')) {
            element.tag = 'imported_' + element.tag;
          }
          imported.components.add(resolvedPath);
          components[element.tag] = resolvedPath;
        }
      }
    };
    glimmer.traverse(ast, visitor);
    const createComponentLetBlockExpr = (comp: [string, string]) => {
      return importProcessors.glimmer.preprocess(`{{#let (component "${comp[1]}") as |${comp[0]}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
    };
    const handleHelper = (helper: { nodes: PathExpression[], resolvedPath: string }) => {
      if (this.options.useModifierHelperHelpers) {
        const lookup = `(ember-hbs-imports/helpers/lookup-helper this "${helper.resolvedPath}")`
        return importProcessors.glimmer.preprocess(`{{#let (helper ${lookup}) as |${helper.nodes[0].original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
      } else {
        helper.nodes.forEach(node => {
          node.original = `ember-hbs-imports/helpers/invoke-helper this '${helper.resolvedPath}'`;
        });
      }
    };
    const handleModifier = (modifier: { nodes: PathExpression[], resolvedPath: string }) => {
      if (this.options.useModifierHelperHelpers) {
        const lookup = `(ember-hbs-imports/helpers/lookup-modifier this "${modifier.resolvedPath}")`
        return importProcessors.glimmer.preprocess(`{{#let (modifier ${lookup}) as |${modifier.nodes[0].original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
      } else {
        modifier.nodes.forEach(node => {
          node.original = modifier.resolvedPath;
        });
      }
    };

    let body: glimmer.AST.TopLevelStatement[] = [];
    const root = body;
    Object.entries(components).forEach((c) => {
      const letComponent = createComponentLetBlockExpr(c);
      body.push(letComponent);
      body = letComponent.program.body;
    });
    Object.values(helpers).forEach((c) => {
      const letHelper = handleHelper(c);
      if (!letHelper) return;
      body.push(letHelper);
      body = letHelper.program.body;
    });
    Object.values(modifiers).forEach((c) => {
      const letModifier = handleModifier(c);
      if (!letModifier) return;
      body.push(letModifier);
      body = letModifier.program.body;
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


export default importProcessors;
