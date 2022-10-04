import BroccoliFilter from 'broccoli-persistent-filter';
import importProcessor from './import-processor';
import md5Hex from 'md5-hex';

export default class TemplateImportProcessor extends BroccoliFilter {
  options: any;
  _console: any;
  extensions: string[];
  targetExtension: string;

  constructor(inputNode, options: any = {}) {
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
  }

  baseDir() {
    return __dirname;
  }

  cacheKeyProcessString(string, relativePath) {
    return md5Hex([require('../package').version, string, relativePath]);
  }

  processString(contents, relativePath) {
    importProcessor.options = Object.assign({}, this.options);
    const [res, imports] = importProcessor.processAst(contents, relativePath);
    this.options.imports.from[relativePath] = new Set();
    Object.values(imports.info.components).forEach((comp) => {
      let path = comp.path;
      if (comp.imp.shouldLookInFile) {
        path = comp.imp.importPath.split('/').slice(0, -1).join('/')
      }
      this.options.imports.components.add(path);
      this.options.imports.from[relativePath].add(path);
    });
    Object.values(imports.info.helpers).forEach((comp) => {
      let path = comp.resolvedPath;
      if (comp.imp.shouldLookInFile) {
        path = comp.imp.importPath.split('/').slice(0, -1).join('/')
      }
      this.options.imports.components.add(path);
      this.options.imports.from[relativePath].add(path);
    });
    Object.values(imports.info.modifiers).forEach((comp) => {
      let path = comp.resolvedPath;
      if (comp.imp.shouldLookInFile) {
        path = comp.imp.importPath.split('/').slice(0, -1).join('/')
      }
      this.options.imports.components.add(path);
      this.options.imports.from[relativePath].add(path);
    });
    return res;
  }
}
