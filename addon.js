'use strict';
const BroccoliFilter = require('broccoli-persistent-filter');
const importLoaders = require('./import-processor').importProcessors;

class ImportAstTransforms {
  transform(ast) {
    importLoaders.replaceInAst(ast, this.relativePath);
  }
  constructor(options) {
    importLoaders.options.root = '.';
    importLoaders.glimmer = options.syntax;
    this.root = '.';
    this.relativePath = options.moduleName;
  }
}

class TemplateImportProcessor extends BroccoliFilter {

  constructor(inputNode, options = {}) {
    if (!options.hasOwnProperty('persist')) {
      options.persist = true;
    }

    super(inputNode, {
      annotation: options.annotation,
      persist: options.persist
    });

    this.options = options;
    this._console = this.options.console || console;

    this.extensions = ['hbs', 'handlebars'];
    this.targetExtension = 'hbs';
    importLoaders.options.root = options.root;
  }

  baseDir() {
    return __dirname;
  }

  processString(contents, relativePath) {
    importLoaders.processAst(contents, relativePath);
  }
}

module.exports = {
  name: require('./package').name,
  setupPreprocessorRegistry(type, registry) {
    registry.add('template', {
      name: 'ember-template-imports',
      ext: 'hbs',
      toTree: (tree) => {
        tree = new TemplateImportProcessor(tree, { root: this.project.root });
        return tree;
      }
    });

    if (type === 'parent') {
      this.parentRegistry = registry;
    }
  }
};
