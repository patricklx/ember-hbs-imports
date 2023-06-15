ember-hbs-imports
==============================================================================

This addon allows you to use import-style syntax to create local bindings to
a helper/component and import styles within a template file.

* More concise invocations while making it explicit where it comes from
* No hyphens needed!
* Relative imports!


there is now an official addon for imports at https://github.com/ember-template-imports/ember-template-imports

Installation
------------------------------------------------------------------------------

```
ember install ember-hbs-imports
```


Usage
------------------------------------------------------------------------------

Use the same kind of import syntax you are familiar with from Javascript:

Syntax:
* import "{ named }" from "my-helpers"
* import "{ * as named }" from "my-helpers"
* import a from 'x': will use helper/component from 'x'
* import * as b from 'x': will user helper/component from path 'x/<b.*>'
* import style from 'x.scoped.scss': import scss and replace content in template 

```hbs
{{import "{ fn }" from "@ember/helper"}}
{{import myHelper from 'ui/helper'}}
{{import my-mod from 'ui/modifiers'}}
{{import style from './styles.scoped.scss'}}
{{import BasicDropdown from 'ember-basic-dropdown/components/basic-dropdown'}}
{{import SameDropdown from 'ember-basic-dropdown/components/basic-dropdown'}}


{{import helper as ashelper from "ui/helpers" }}
{{import a as ahelper from "ui/helpers" }}
{{import "* as helpers" from "u/helpersi" }}
{{import "a, b" from "ui/helpers" }}
{{import "a as x, b as y" from "ui/helpers" }}
{{import "a as z, helper" from "ui/helpers" }}


{{myHelper 'a'}}
{{helpers.x 'a'}}

<BasicDropdown class={{style.myclass}} />
<SameDropdown @param={{style.myclass}} />

<a {{my-mod}} />
```

The helper is looked up from the given string using a direct lookup
pattern. I set the `resolveHelper` in the resolver. 
All this addon does is taking that `{{import ...}}` statement
and replacing all helper invocations with `{{ember-hbs-import/helpers/invoke-helper 'myHelper' ...}}`.

Our helper then looks up the actual helper and calls `compute` with the other arguments



Embroider Support
------------------------------------------------------------------------------
to also have style imports working you need to add following to the embroider packagerOptions.
this will prefix the styles with a specific hash, which is the same ember-hbs-imports will use in the templates.
```js
const spark_md5 = require('spark-md5');
...
packagerOptions: {
      webpackConfig: {
        module: {
          rules: [
            {
              test: /app\/styles\/app.scss$/i,
              use: [
                { loader: 'style-loader' },
                { loader: 'css-loader', options: {
                    modules: {
                      mode: 'global',
                    }
                  } },
                { loader: 'sass-loader' }
              ],
            },
            {
              test: /\.scoped\.scss$/i,
              use: [
                { loader: 'style-loader' },
                { loader: 'css-loader', options: {
                    modules: {
                      mode: 'local',
                      getLocalIdent(context, localIdentName, localName) {
                        const name = localName;
                        let namespace = context.resourcePath.split('node_modules').slice(-1)[0];
                        if (namespace.startsWith('@')) {
                          namespace = namespace.split('/').slice(0, 2).join('/');
                        } else {
                          namespace = namespace.split('/')[0];
                        }
                        let relativePath = context.resourcePath;
                        relativePath = relativePath.replace(/\\/g, '/');
                        const prefix = context.context;
                        const hashKey = `${namespace}_${prefix}_${name}`;
                        return `${namespace}_${prefix}_${name}_${spark_md5.hash(hashKey).slice(0, 5)}`;
                      }
                    }
                  } },
                { loader: 'sass-loader' }
              ],
            },
          ],
        },
      }
    }
```

Glint Support
------------------------------------------------------------------------------
* use `ember-hbs-imports` as glint environment, remove ember-loose.
* make sure that there is an import for every values or dont use imports at all

Template Lint Support
------------------------------------------------------------------------------
* add plugin `"ember-hbs-imports/hbs-imports-rule"` to your `.template-lintrc.js`
* enable or disable rule `'must-have-hbs-imports': true`

Motivation
------------------------------------------------------------------------------

[ember-template-component-import](https://github.com/crashco/ember-template-component-import)
already gives us import for components, but I really miss the helper imports.
So I went ahead and added this functionality :)


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
