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
    const Funnel = require('broccoli-funnel');
    const MergeTrees = require('broccoli-merge-trees');
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
  }
};
