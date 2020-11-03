const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const { hash } = require('spark-md5');

function generateScopedName(name, relativePath, namespace) {
  relativePath = relativePath.replace(/\\/g, '/');
  const prefix = relativePath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${hash(hashKey).slice(0, 5)}`;
}

const rewriterPlugin = postcss.plugin('postcss-importable', ({ filename, deep, namespace }) => (css) => {
  if (deep) {
    css.walkRules((rule) => {
      rule.selectors = rule.selectors.map((selector) => {
        const name = selector.slice(1);
        return `.${generateScopedName(name, filename, namespace)}`;
      });
    });
  } else {
    css.nodes.forEach((node) => {
      if (node.type === 'rule') {
        node.selectors = node.selectors.map((selector) => {
          const name = selector.slice(1);
          return `.${generateScopedName(name, filename, namespace)}`;
        });
      }
    });
  }
});


type Context = {
  resourcePath: string;
  namespace: string;
}

function hbsStylesLoader(context: Context, contents) {
  if (context.resourcePath.endsWith('pod-styles.scss')) {
    return contents;
  }
  if (context.resourcePath.endsWith('scoped.scss')) {
    const relativePath = context.resourcePath;
    return postcss([
      rewriterPlugin({
        filename: relativePath,
        namespace: context.namespace,
        deep: false
      })
    ])
      .process(contents, {
        from: relativePath,
        to: relativePath,
        parser: postcssScss
      })
      .then(results => results.css);
  }
}

export default function(resourcePath, namespace, contents) {
  const context: Context = {
    resourcePath,
    namespace
  }
  return hbsStylesLoader(context, contents);
};
