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
    this.options.imports.from[relativePath] = [];
    imports.components.forEach((comp) => {
      this.options.imports.components.add(comp);
      this.options.imports.from[relativePath].push(comp);
    });
    imports.others.forEach((comp) => {
      this.options.imports.others.add(comp);
      this.options.imports.from[relativePath].push(comp);
    });
    return res;
  }
}
