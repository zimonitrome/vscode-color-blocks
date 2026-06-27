## TODO:

Should do:
* Make automatic line-count updates less intrusive.
    * Consider defaulting auto-update off, or making updates a command/code action.
    * Keep protecting normal typing edits from extension-owned edits.
* Extend automated verification.
    * Add visual checks for dark/light themes if VS Code screenshots can be automated reliably.
* Make automatic line-count updates safer without delaying normal editing.
    * Do not debounce visible line-count updates; rapid Enter presses inside a block should update immediately.
    * Keep the existing protections for same-line edits, count-text edits, and editor/document targeting.
    * If this is revisited, prefer surgical guards over timing delays.
* Update videos and images to show 2.0.0 behvaior
* Test performance on slow PCs.

Could do:
* Investigate other built-in VS Code operations that can split undo history when `autoUpdate` edits line counts.
* Improve the publish script.
* Performance
    * Parsing many lines halts the application. I.e. if you have a color block with a very large number of lines.
* Command to convert current codes with comment on top to color block.
    * Change current command to do this?
* Change expand on style range if possible
    * Meaning: Make adding/removing newlines smooth and quick.
* Add optional pattern such as stripes to the background.
    * Set as 2nd argument.
    * Good reference: https://www.magicpattern.design/tools/css-backgrounds
    * Patterns:
        * \# -> Boxes
        * \## -> Gingham
        * / -> Spaced stripes
        * // -> Tight stripes
        * w -> ZigZag/chevron
        * . -> Polkadot
        * [] -> Checkerboard
        * <> -> Rhombus
* Improve overlapping ranges text colors.
    * Currently the text looks bland as multiple ranges alpha blend.
* Add optional left bar.
* Add opacity to hex color (make 4/8 hex color len OK)
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.
    * Sounds annoying to have many a second file. Should probably be stored in a single file instead.
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)

Blocked / unavailable:
* Show colored ranges on the built-in minimap.
    * The public VS Code extension API does not expose minimap decorations; Color Blocks already uses overview ruler decorations as the closest supported marker.
    * VS Code issue: https://github.com/microsoft/vscode/issues/82808
    * Related VS Code issues:
        * https://github.com/microsoft/vscode/issues/68114
        * https://github.com/microsoft/vscode/issues/136360
* Drag-resize handles for color block outlines.
    * The public VS Code extension API does not expose drag/drop or pointer events for editor decorations.
    * Closest VS Code issue: https://github.com/microsoft/vscode/issues/120674
    * Related VS Code issue: https://github.com/microsoft/vscode/issues/47239

Probably won't do:
* Change the syntax.
* Make syntax configurable.
