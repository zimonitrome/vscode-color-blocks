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
* Show ranges on minimap. (is this possible?)
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
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)

Probably won't do:
* Change the syntax.
* Make syntax configurable.
