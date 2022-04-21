## TODO:

Should do:
* ~~Support block comments.~~
* Fix comment color (some of it should be dimmed)
* Test performance on slow PCs.
    * It is still kinda laggy even on a good PC... why?
* Add setting to toggle on/off.
* Don't clear ranges when moving to another file.
* Fix bug: Line copying (alt+up/down) creates undoStops
    * Extension can also not catch up if it is done too much. Why? Operations taking too long?
* ~~Only dim content inside comment, not any code before the comment.~~
* Fix word wrap

Could do:
* Command to convert current codes with comment on top to color block.
    * Change current command to do this?
* Show ranges on minimap. (is this possible?)
* Make comment text larger (like a title)
    * ANSWER: This is soon toggleable
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
* Support light theme better.
    * Make comments darker instead of brighter.
        * Change settings and variable to not say "brighter"/"lighter".
* Improve overlapping ranges text colors.
    * Currently the text looks bland as multiple ranges alpha blend.
* Fix overflowing lines stacking up at the end of a document.
* ~~Fix don't extend ranges if it's the last line of the document.~~
* Prevent last line break removal from shrinking block range.
* Add optional left bar.
* Add opacity to hex color (make 4/8 hex color len OK)
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)

Probably won't do:
* Change the syntax.
* Make syntax configurable.