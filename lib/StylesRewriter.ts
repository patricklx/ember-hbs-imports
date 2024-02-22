import { rewriterPlugin } from './rewriter-plugin';
import BroccoliFilter from 'broccoli-persistent-filter';
import md5Hex from 'md5-hex';
import postcss, { AcceptedPlugin } from 'postcss';
import postcssScss from 'postcss-scss';

type Options = {
  namespace: string;
  extension: string;
  before: AcceptedPlugin[],
  after: AcceptedPlugin[]
};

module.exports = class StylesRewriter extends BroccoliFilter {
  options: Options;
  extensions: string[];
  targetExtension: string;

  constructor(inputNode, options: Partial<Options> = {}) {
    super(inputNode, { persist: true, ...options });
    // @ts-ignore
    this.options = options;
    this.options.extension = this.options.extension || 'scss';
    this.options.before = this.options.before || [];
    this.options.after = this.options.after || [];
    this.extensions = [ 'module.' + this.options.extension ];
    this.targetExtension = 'module.' + this.options.extension;
  }

  cacheKeyProcessString(string, relativePath) {
    return md5Hex([require('../package').version, string, relativePath]);
  }

  baseDir() {
    return __dirname;
  }

  processString(contents, relativePath) {
    return this.processStyles(relativePath, contents);
  }

  processStyles(relativePath, contents) {
    if (relativePath.endsWith('pod-styles.scss')) {
      return contents;
    }
    if (relativePath.endsWith('module.scss')) {
      const plugins = [...this.options.before]
      plugins.push(rewriterPlugin({
        filename: relativePath,
        namespace: this.options.namespace,
        deep: false
      }))
      plugins.push(...this.options.after)

      return postcss(plugins)
        .process(contents, {
          from: relativePath,
          to: relativePath,
          parser: postcssScss
        })
        .then(results => results.css);
    }
  }

}
