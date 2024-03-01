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
  const name = this.name === 'dummy' ? 'dummy' : this.project.name();
  const funnel = new Funnel(tree, {
    include: [/^addon-tree-output/, new RegExp('^' + name)]
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


  _findApp() {
    let parent = this.parent;
    while (!parent.app) {
      parent = parent.parent;
    }
    return parent.app;
  },

  _getAddonOptions() {
    const parentOptions = this.parent && this.parent.options;
    const appOptions = this._findApp().options;
    const addonOptions = Object.assign({}, parentOptions, appOptions);

    return Object.assign({
      style: {
        extension: 'scss',
        plugins: {
          before: [],
          after: []
        }
      }
    }, addonOptions['ember-hbs-imports']);
  },

  _getBabelOptions() {
    const parentOptions = this.parent && this.parent.options;
    const appOptions = this.app && this.app.options;
    const addonOptions = parentOptions || appOptions || {};

    addonOptions.babel = addonOptions.babel || {};
    addonOptions.babel.plugins = addonOptions.babel.plugins || [];
    return addonOptions.babel;
  },

  included(includer) {
    this.includer = includer;
    // If we are being used inside an addon, then we want the addon's scoped styles
    // to be processed, but not the consuming app's. So we wrap the parent addon's
    // treeForAddonStyles to process them for scoping.
    if (isAddon(this.parent)) {
      const original = this.parent.treeForStyles || ((t) => t);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.parent.treeForStyles = function(stylesInput = path.join(this.root, this.treePaths['addon-styles'])) {
        let originalOutput = original.call(this, stylesInput);
        const scopedOutput = self._scopedStyles(path.join(this.root, this.treePaths.addon), this.name);
        originalOutput = new Funnel(originalOutput, { srcDir: this.treePaths.styles });
        return stew.mv(new Merge([ originalOutput, scopedOutput ]), this.treePaths.styles + '/' + this.name);
      }
    }
    const name = typeof this.parent.name === 'function' ? this.parent.name() : this.parent.name;
    const isDummy = isDummyAppBuild(this);

    const VersionChecker = require('ember-cli-version-checker');
    const checker = new VersionChecker(this);
    const ember = checker.for('ember-source');
    const addonOptions = this._getAddonOptions();
    const options = {
      styleExtension: addonOptions.style.extension,
      root: path.join(this.project.root, ...(isDummy ? ['tests','dummy'] : [])),
      failOnMissingImport: false,
      failOnBadImport: false,
      namespace: isDummy ? 'dummy' : name,
      imports: {},
      useModifierHelperHelpers: ember.isAbove('v3.27.0-beta.2'),
      useHelperWrapper: !ember.isAbove('v3.27.0-beta.2'),
      embroiderStatic: addonOptions.embroiderStatic,
    }
    this._getBabelOptions().plugins.splice(0, 0, [require.resolve('./lib/hbs-imports-babel-plugin'), options]);
    this._super.included.call(this, arguments);
  },

  treeForStyles(tree) {
    const trees = [];
    if (tree) {
      trees.push(tree);
    }
    if (isApp(this.parent)) {
      trees.push(this._scopedStyles(path.join(this.parent.root, 'app'), this.parent.name()));
    }
    if (isDummyAppBuild(this)) {
      const config = this._getAddonOptions().style;
      trees.push(this._scopedStyles(path.join(this.project.root, 'app'), this.parent.name(), `${this.parent.name()}-pod-styles.${config.extension}`));
      trees.push(this._scopedStyles(path.join(this.project.root, 'tests', 'dummy', 'app'), 'dummy'));
    }
    return new Merge(trees);
  },

  _scopedStyles(tree, namespace, outputFile) {
    const config = this._getAddonOptions().style;
    outputFile = outputFile || 'pod-styles.' + config.extension
    tree = new Funnel(tree, { include: [ '**/*.module.' + config.extension ] });
    tree = new StylesRewriter(tree, {
      namespace,
      extension: config.extension,
      before: config.plugins.before,
      after: config.plugins.after,
    });
    tree = new Concat(tree, { allowNone: true, outputFile });
    return tree;
  },

  setupPreprocessorRegistry(type, registry) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    registry.add('template', {
      name: 'ember-hbs-imports',
      ext: 'hbs',
      before: ['ember-cli-htmlbars'],
      toTree: (tree) => {
        const name = typeof self.parent.name === 'function' ? self.parent.name() : self.parent.name;
        const isDummy = isDummyAppBuild(self);

        const VersionChecker = require('ember-cli-version-checker');
        const checker = new VersionChecker(this);
        const ember = checker.for('ember-source');
        const addonOptions = this._getAddonOptions();
        const options = {
          styleExtension: addonOptions.style.extension,
          root: path.join(this.project.root, ...(isDummy ? ['tests','dummy'] : [])),
          failOnMissingImport: false,
          failOnBadImport: false,
          namespace: isDummy ? 'dummy' : name,
          imports: this.imports,
          useModifierHelperHelpers: ember.isAbove('v3.27.0-beta.2'),
          useHelperWrapper: !ember.isAbove('v3.27.0-beta.2'),
          embroiderStatic: addonOptions.embroiderStatic,
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
