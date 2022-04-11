## TODO:

Should do:
* Fix extension being super slow with many comments (or long text)?
* Support block comments.
* Test performance on slow PCs.
    * Reduce update frequency.
* Add setting to toggle on/off.
* Don't clear ranges when moving to another file.
* Fix bug: Line copying (alt+up/down) creates undoStops
    * Extension can also not catch up if it is done too much. Why? Operations taking too long?
* Only dim content inside comment, not any code before the comment.

Could do:
* Command to convert current codes with comment on top to color block.
    * Change current command to do this?
* Change the syntax.
* Make syntax configurable.
* Add optional left bar.
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
* Make comment text larger (like a title)
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.
* Support light theme better.
    * Make comments darker instead of brighter.
        * Change settings and variable to not say "brighter"/"lighter".
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)
* Improve overlapping ranges text colors.
    * Currently the text looks bland as multiple ranges alpha blend.
* Show ranges on minimap. (is this possible?)
* Fix overflowing lines stacking up at the end of a document.
* Fix don't extend ranges if it's the last line of the document.
* Prevent last line break removal from shrinking block range.