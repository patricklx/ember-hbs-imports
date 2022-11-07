import BroccoliFilter from 'broccoli-persistent-filter';
import md5Hex from 'md5-hex';

class VerifyImports extends BroccoliFilter {
  options: {
    failOnMissingImport: boolean
  };
  imports: {
    from: Record<string, Set<string>>
  };
  files: Set<any>;

  constructor(inputNode, options: any = {}) {
    super(inputNode, Object.assign({ persist: true }, options));
    this.options = options;
    this.imports = options.imports;
    this.files = new Set();
  }
  cacheKeyProcessString(string, relativePath) {
    return md5Hex([require('../package').version, string, relativePath, Math.random().toString()]);
  }
  baseDir() {
    return __dirname;
  }

  async build(...args) {
    const r = await super.build(...args);
    const imports = this.imports;
    Object.entries(imports.from).forEach(([from, imps]) => {
      const files = [...imps.values()].filter((f) => f !== '@ember/helper' && f !== '@ember/modifier');
      const notFound = files.filter((i) => !this.files.has(i) && !this.files.has(i + '.js') && !this.files.has(i+'/index') && !this.files.has(i+'/index.js'));
      if (notFound.length) {
        if (this.options.failOnMissingImport) {
          throw new Error(from + ':imports not found -> ' + notFound)
        }
        console.error(from,':imports not found', notFound);
      }
    })
    return r;
  }

  processString(contents, relativePath) {
    if (relativePath.startsWith('vendor')) return contents;
    if (relativePath.startsWith('node_modules')) return contents;
    relativePath = relativePath.replace('addon-tree-output/', '');
    if (relativePath.endsWith('/template.js')) {
      relativePath = relativePath.replace('/template.js', '');
    }
    if (relativePath.endsWith('/component.js')) {
      relativePath = relativePath.replace('/component.js', '');
    }
    this.files.add(relativePath);
    return contents;
  }
}

module.exports = VerifyImports;
