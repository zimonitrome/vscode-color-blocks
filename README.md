# color-block-comments README

Add colorful comments ranges that span multiple lines. This makes it more clear to understand what lines a comment refers to and can thus be used to group, and organize your code. It also makes it easier for you to find your way in long spaghetti code.

## Rationale

We as humans are very dependent on our vision to perform task. Programming is no different. I often find myself getting lost in long files of code. I want an extension that helps me navigate regions of similar looking code through

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Inspired by

* [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
* [Blockman](https://marketplace.visualstudio.com/items?itemName=leodevbro.blockman)
* [HiLight](https://marketplace.visualstudio.com/items?itemName=f0lio.hilight)

## TODO:

Should do:
* Enable block comments.
* Publish extension
* Record videos to show features
* Finish readme
* Test performance on slow PCs
    * Reduce update requency
* Fix nested highlights
* Fix indentation comments

Could do:
* Change the syntax
* Make syntax configurable
* Add optional left padding
* Add optional left bar
* Add optional pattern such as stripes to the background
* Setting to wrap indentation before and after
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.

## Known Issues

* Special characters longer than 1ch might overflow the comment range
* Block comments are not supported for the moment.
* Nested blocks currently look weird
* Snippet/commands does not support indentation when wrapping

## Release Notes

### 0.0.0

Pre release

-----------------------------------------------------------------------------------------------------------
## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
