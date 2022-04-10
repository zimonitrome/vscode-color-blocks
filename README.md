# Color Blocks

Add colorful comment ranges that span multiple lines. This makes it easier to understand what lines a comment refers to and can thus be used to group and organize your code. It also makes it easier for you to find your way in long spaghetti code.

## Motivation

We as humans are very dependent on our vision to perform task. Programming is no different. I often find myself getting lost in long files of code. I want an extension that helps me navigate regions of similar looking code through

## Features

Three different ways to add color blocks.

![feature X](/media/how_to_add_blocks.gif)

## Inspired by

* [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
* [Blockman](https://marketplace.visualstudio.com/items?itemName=leodevbro.blockman)
* [HiLight](https://marketplace.visualstudio.com/items?itemName=f0lio.hilight)

GIFs were produced using [Gifski](https://gif.ski/).

## TODO:

Should do:
* Enable block comments
* ~Record videos to show features~
    * Record better videos that are updated
* Finish readme
    * First media should be a basic image showing the color blocks
    * Then videos showing usage and different settings etc.
    * Add settings section
* Test performance on slow PCs
    * Reduce update frequency

Could do:
* Change the syntax
* Make syntax configurable
* Add optional left padding
* Add optional left bar
* Add optional pattern such as stripes to the background
* Setting to wrap indentation before and after
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.
* Support light theme better
    * Make comments darker instead of brighter
        * Change settings and variable to not say "brighter"/"lighter"
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)
* Fix overlapping ranges text colors
    * Currently the text looks bland as multiple ranges alpha blend.
* Show ranges on minimap (is this possible?)
* Fix overflowing lines stacking up at the end of a document
* Fix don't extend ranges if it's the last line of the document
* Prevent last line break removal from shrinking block range

## Known Issues

* Special characters longer than 1ch might overflow the comment range
* Block comments are not supported for the moment
* Nested blocks currently look weird
* Snippet/commands does not support indentation when wrapping