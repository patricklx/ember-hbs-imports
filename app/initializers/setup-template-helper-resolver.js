export default {
  name: 'setup-template-helper-resolver',
  initialize: function initialize(application) {
    let resolver = application.__registry__.resolver._fallback || application.__registry__.resolver;
    const resolveHelper = resolver.resolveHelper;
    resolver.resolveHelper = function(parsedName) {
      if (resolveHelper) {
        const resolved = resolveHelper.call(this, parsedName);
        if (this._moduleRegistry.has(resolved)) {
          const module = this._moduleRegistry.get(normalizedModuleName);
          return module.helper || module.default;
        }
      }
      let prefix = this.namespace.podModulePrefix;
      let fullNameWithoutType = parsedName.fullNameWithoutType;

      let normalizedModuleName = prefix + '/' + fullNameWithoutType;
      if (this._moduleRegistry.has(normalizedModuleName)) {
        const module = this._moduleRegistry.get(normalizedModuleName);
        return module.helper || module.default;
      }

      prefix = this.namespace.modulePrefix;
      normalizedModuleName = prefix + '/' + fullNameWithoutType;
      if (this._moduleRegistry.has(normalizedModuleName)) {
        const module = this._moduleRegistry.get(normalizedModuleName);
        return module.helper || module.default;
      }

      if (this._moduleRegistry.has(fullNameWithoutType)) {
        const module = this._moduleRegistry.get(fullNameWithoutType);
        return module.helper || module.default;
      }

      return undefined;
    };
  }
};
