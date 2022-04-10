# Color Blocks

Add colorful comment ranges that span multiple lines. This makes it easier to understand what lines a comment refers to and can thus be used to group and organize your code. It also makes it easier for you to find your way in long spaghetti code.

![feature X](/media/basic_example.png)

## Motivation

We rely on our vision to navigate large code files. I often find myself getting lost when working with code bases of similar looking lines or ambiguous syntax. To navigate code files, we either normally read the syntax semantically, look at the macro shape of larger structures of lines, use comments (sometimes with dividers/other blocks), or use ctrl+f as we frantically scroll through our files. This extensions aims to help navigate and annotate code by providing colors to mark regions of files, making them distinguishable visually.

## Features & Settings

### Syntax

```
# MyColorBlock {#f9e, 4}
|       |         |   |
|       |         |   |-> number of lines
|       |         |
|       |         |-> hex color 3 or 6 characters
|       |
|       |-> text annotation
|
|-> comment character (here for Python)
```

### Three different ways to add color blocks.

* **Manually**  
  By typing `# MyColorBlock {#f9e, 4}` for example.

* **Snippet**  
  By start writing `color block` and selecting it from the context menu suggestions.

* **Command**  
  By pressing <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd> and selecting "Add Color Block". This command can be bound to a hotkey.

![feature X](/media/how_to_add_blocks.gif)

### Wrapping

![feature X](/media/wrapping.gif)

### Styling

![feature X](/media/style_settings.gif)

## Inspired by

* [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
* [Blockman](https://marketplace.visualstudio.com/items?itemName=leodevbro.blockman)
* [HiLight](https://marketplace.visualstudio.com/items?itemName=f0lio.hilight)

GIFs were produced using [Gifski](https://gif.ski/).

## Known Issues

* Block comments are not supported for the moment
* Special characters longer than 1ch might overflow the comment range