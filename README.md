ember-hbs-imports
==============================================================================

merged
* ember-template-component-import
* ember-template-style-import
* ember-template-helper-import
* ember-template-modifier-import

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
* import a from 'x': will use helper/component from 'x'
* import * as b from 'x': will user helper/component from path 'x/<b.*>'
* import style from 'x.scoped.scss': import scss and replace content in template 

```hbs
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

Motivation
------------------------------------------------------------------------------

[ember-template-component-import](https://github.com/crashco/ember-template-component-import)
already gives us import for components, but I really miss the helper imports.
So I went ahead and added this functionality :)


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
