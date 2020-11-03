import processStyles from "./hbs-styles-import-loader";
import BroccoliFilter from "broccoli-persistent-filter";
import md5Hex from "md5-hex";

module.exports = class StylesRewriter extends BroccoliFilter {
  options: {
    namespace: string
  };
  extensions: string[];
  targetExtension: string;

  constructor(inputNode, options: any = {}) {
    super(inputNode, { persist: true, ...options });
    this.options = options;
    this.extensions = [ 'scoped.scss' ];
    this.targetExtension = 'scoped.scss';
  }

  cacheKeyProcessString(string, relativePath) {
    return md5Hex([require('../package').version, string, relativePath]);
  }

  baseDir() {
    return __dirname;
  }

  processString(contents, relativePath) {
    return processStyles(relativePath, this.options.namespace, contents);
  }
}
