const TemplateImportProcessor = require('./lib/TemplateImportProcessor').default;
const StylesRewriter = require('./lib/StylesRewriter');
const VerifyImports = require('./lib/VerifyImports');
const path = require('path');
const Funnel = require('broccoli-funnel');
const Merge = require('broccoli-merge-trees');
const Concat = require('broccoli-concat');
const stew = require('broccoli-stew');

function isApp(appOrAddon) {
  return !isAddon(appOrAddon);
}

function isAddon(appOrAddon) {
  return !!appOrAddon.pkg.keywords && appOrAddon.pkg.keywords.indexOf('ember-addon') > -1;
}

function isDummyAppBuild(self) {
  return isAddon(self.parent) && self.parent.name === self.project.name && self.parent.pkg === self.project.pkg;
}

const imports = {
  from: {},
  components: new Set(),
  others: new Set()
};

const Packager = require('ember-cli/lib/broccoli/default-packager');
const processJavascript = Packager.prototype.processJavascript;
Packager.prototype.processJavascript = function(tree) {
  const funnel = new Funnel(tree, {
    include: [/^addon-tree-output/, new RegExp('^' + this.project.name())]
  });
  return new Merge([new VerifyImports(funnel, {
    imports: imports
  }), processJavascript.call(this, tree)], {
    overwrite: true
  });
}

module.exports = {
  name: require('./package').name,
  imports: imports,

  included(includer) {
    this.includer = includer;
    // If we are being used inside an addon, then we want the addon's scoped styles
    // to be processed, but not the consuming app's. So we wrap the parent addon's
    // treeForAddonStyles to process them for scoping.
    if (isAddon(this.parent)) {
      let original = this.parent.treeForStyles || ((t) => t);
      let self = this;
      this.parent.treeForStyles = function(stylesInput = path.join(this.root, this.treePaths['addon-styles'])) {
        let originalOutput = original.call(this, stylesInput);
        let scopedOutput = self._scopedStyles(path.join(this.root, this.treePaths.addon), this.name);
        originalOutput = new Funnel(originalOutput, { srcDir: this.treePaths.styles });
        return stew.mv(new Merge([ originalOutput, scopedOutput ]), this.treePaths.styles + '/' + this.name);
      }
    }
    this._super.included.call(this, arguments);
  },

  treeForStyles(tree) {
    let trees = [];
    if (tree) {
      trees.push(tree);
    }
    if (isApp(this.parent)) {
      trees.push(this._scopedStyles(path.join(this.parent.root, 'app'), this.parent.name()));
    }
    if (isDummyAppBuild(this)) {
      trees.push(this._scopedStyles(path.join(this.project.root, 'app'), this.parent.name(), `${ this.parent.name() }-pod-styles.scss`));
      trees.push(this._scopedStyles(path.join(this.project.root, 'tests', 'dummy', 'app'), 'dummy'));
    }
    return new Merge(trees);
  },

  _scopedStyles(tree, namespace, outputFile = 'pod-styles.scss') {
    tree = new Funnel(tree, { include: [ `**/*.scoped.scss` ]});
    tree = new StylesRewriter(tree, {
      namespace
    });
    tree = new Concat(tree, { allowNone: true, outputFile });
    return tree;
  },

  setupPreprocessorRegistry(type, registry) {
    const self = this;
    registry.add('template', {
      name: 'ember-template-imports',
      ext: 'hbs',
      toTree: (tree) => {
        const name = typeof self.parent.name === 'function' ? self.parent.name() : self.parent.name;
        const isDummy = isDummyAppBuild(self);
        const options = {
          root: path.join(this.project.root, ...(isDummy ? ['tests','dummy'] : [])),
          failOnMissingImport: false,
          failOnBadImport: false,
          namespace: isDummy ? 'dummy' : name,
          imports: this.imports
        }
        tree = new TemplateImportProcessor(tree, options);
        return tree;
      }
    });

    if (type === 'parent') {
      this.parentRegistry = registry;
    }
  }
};
