ember-template-imports
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


Installation
------------------------------------------------------------------------------

```
ember install ember-template-imports
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

<BasicDropdown />
<SameDropdown />

<a {{my-mod}} />
```

The helper is looked up from the given string using a direct lookup
pattern. I set the `resolveHelper` in the resolver. 
All this addon does is taking that `{{import ...}}` statement
and replacing all helper invocations with `{{ember-template-helper-import/helpers/invoke-helper 'myHelper' ...}}`.

Our helper then looks up the actual helper and calls `compute` with the other arguments

Motivation
------------------------------------------------------------------------------

[ember-template-component-import](https://github.com/crashco/ember-template-component-import)
already gives us import for components, but I really miss the helper imports.
So I went ahead and added this functionality :)


But what about Module Unification?
------------------------------------------------------------------------------

Once Module Unification lands fully, this addon will be largely obsolete. MU
provides all these benefits and more.

So on the one hand, your templates will start to look _something kinda like_
MU a little sooner, which is nice.

But be warned - any official tooling to codemod templates into a new MU world
likely won't support this addon. So weigh the pros and cons carefully before
widely adopting this addon.

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
