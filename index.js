const path = require('path');
module.exports = {
  patchEmberApp(app) {
    const Funnel = require('broccoli-funnel');
    const tree = new Funnel('app/ui', {
      allowEmtpy: true,
      include: ['index.html'],
      destDir: app.name,
      annotation: 'ui to index.html'
    });

    const toArray = app.toArray;
    app.toArray = function () {
      const arr = toArray.call(this);
      arr.push(tree);
      return arr;
    };
  },

  patchEmbroider() {
    const { Webpack } = require('@embroider/webpack');
    const resolver = require('@embroider/compat/src/resolver').default;
    const tryComponent = resolver.prototype.tryComponent;
    resolver.prototype.tryComponent = function (compPath, from, withRuleLookup) {
      let res = tryComponent.call(this, compPath, from, withRuleLookup);
      if (res) return res;

      res = tryComponent.call(this, path.join('..', 'node_modules', compPath), from, withRuleLookup);
      if (res) return res;

      res = tryComponent.call(this, path.join('..', compPath), from, withRuleLookup);
      if (res) return res;

      return null;
    };

    const resolveImport = resolver.prototype.resolveImport;
    resolver.prototype.resolveImport = function(modPath, from) {
      let res = resolveImport.call(this, modPath, from);
      if (res) return res;

      res = resolveImport.call(this, path.join('..', 'node_modules', modPath), from);
      if (res) return res;

      res = resolveImport.call(this, path.join('..', modPath), from);
      if (res) return res;

      return null;
    };

    const tryHelper = resolver.prototype.tryHelper;
    resolver.prototype.tryHelper = function(modPath, from) {
      let res = tryHelper.call(this, modPath, from);
      if (res) return res;

      res = tryHelper.call(this, path.join('..', 'node_modules', modPath), from);
      if (res) return res;

      res = tryHelper.call(this, path.join('..', modPath), from);
      if (res) return res;

      return null;
    };

    const v1App = require('@embroider/compat/src/v1-app').default;
    const indexTreeProto = Object.getOwnPropertyDescriptor(v1App.prototype, 'indexTree');
    Object.defineProperty(v1App.prototype, 'indexTree', {
      get() {
        const appTree = this.app.trees.app;
        const indexTree = new Funnel(this.app.trees.app, {
          srcDir: 'ui',
          allowEmtpy: true,
          include: ['index.html'],
          destDir: '.',
          annotation: 'ui to index.html'
        });
        this.app.trees.app = new MergeTrees([appTree, indexTree]);
        const res = indexTreeProto.get.call(this);
        this.app.trees.app = appTree;
        return res;
      }
    });
  },

  patchEmberTemplateLint() {
    const path = require("path");
    const templateLint = require('ember-template-lint');
    const verify = templateLint.default.constructor.verify;

    let relativePath = '';
    templateLint.default.constructor.verify = async function (options) {
      relativePath = path.relative(process.cwd(), options.filePath);
      return verify.call(this, options);
    }


    const glimmerPath = require.resolve('@glimmer/syntax', { paths: ["node_modules/ember-template-recast/node_modules", "node_modules"] });
    const glimmer = require(path.join(glimmerPath.replace('index.js', ''), '/lib/parser/tokenizer-event-handlers'));
    const preprocess = glimmer.preprocess;

    const hbsImportsProcessor = require('ember-hbs-imports/lib/import-processor')
    const hbsImportPreprocess = function(template) {
      const ast = preprocess(template);
      hbsImportsProcessor.default.replaceInAst(ast, relativePath);
      return ast;
    }
    glimmer.preprocess = hbsImportPreprocess;
  }
};
