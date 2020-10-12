import { importProcessors } from "./import-processor";

const extraDeps: any = {};

function hbsLoader(this: any/*webpack.loader.LoaderContext*/, templateContent) {
  importProcessors.options.root = this.rootContext;
  const pkgName = require(this.rootContext + '/package.json').name;
  const [tplContent, imported] = importProcessors.processAst(templateContent, this.resourcePath);
  extraDeps[this.resourcePath] = [];
  imported.others.forEach((other) => {
    if (other.startsWith(pkgName)) {
      other = other.replace(pkgName, this.rootContext);
    }
    if (other.startsWith('~')) {
      other = other.replace('~', this.rootContext);
    }
    if (other.startsWith('ui/')) {
      other = this.rootContext + '/' + other;
    }
    other = other.replace('node_modules/', '');
    if (other.endsWith('scss')) {
      this.addDependency(other);
      extraDeps[this.resourcePath].push(other);
    }
  });
  return tplContent;
}

export = hbsLoader;
