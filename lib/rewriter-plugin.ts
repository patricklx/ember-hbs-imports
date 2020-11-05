import { hash } from 'spark-md5';


function generateScopedName(name, relativePath, namespace) {
  relativePath = relativePath.replace(/\\/g, '/');
  const prefix = relativePath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${hash(hashKey).slice(0, 5)}`;
}

type Params = {
  filename: string,
  deep: boolean,
  namespace: string
}


export const rewriterPlugin = ({ filename, deep, namespace }: Params) => {
  return {
    postcssPlugin: 'postcss-importable',
    Once(css) {
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
    }
  }
}
