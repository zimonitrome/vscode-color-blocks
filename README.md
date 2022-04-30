# Color Blocks

Add colorful comment ranges that span multiple lines. This makes it easier to understand what lines a comment refers to and can thus be used to group and organize your code. It also makes it easier for you to find your way in long spaghetti code.

![feature X](/media/basic_example.png)

---

## Features & Settings

### Syntax

This extension will look for curly brackets inside comments containing at least a hex color argument. Example:

```
# MyColorBlock {#f9e, 4}
|       |         |   |
|       |         |   |-> number of lines (optional)
|       |         |
|       |         |-> hex color 3 or 6 characters
|       |
|       |-> text annotation
|
|-> comment character (here for Python)
```


### Sample usage

Color blocks work with both line comments and block comments. All lines in the comment will be part of the color block. If no number is specified after the hex color argument, then the color range will also capture any lines until an empty line.

![block comment example](/media/block_comments_example.png)

### Three different ways to add color blocks.

* **Manually**  
  By typing `# MyColorBlock {#f9e, 4}` for example.

* **Snippet**  
  By start writing `color block` and selecting it from the context menu suggestions.

* **Command**
  By pressing <kbd>CTRL</kbd>+<kbd>C</kbd> <kbd>CTRL</kbd>+<kbd>B</kbd> in succession (similar to the default command for toggling line comments).

  Alternatively by selecting "Add Color Block" from the command palette (<kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd>).

![feature X](/media/how_to_add_blocks.gif)

**Note:** The above video is slightly outdated.

### Wrapping

![feature X](/media/wrapping.gif)

**Note:** The above video is slightly outdated.


### Styling

![feature X](/media/style_settings.gif)

**Note:** The above video is slightly outdated.


---

## Inspired by

* [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
* [Blockman](https://marketplace.visualstudio.com/items?itemName=leodevbro.blockman)
* [HiLight](https://marketplace.visualstudio.com/items?itemName=f0lio.hilight)

GIFs were produced using [Gifski](https://gif.ski/).