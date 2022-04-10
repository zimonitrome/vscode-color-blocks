## TODO:

Should do:
* Enable block comments.
* Finish readme.
    * Videos showing usage and different settings etc.
* Test performance on slow PCs.
    * Reduce update frequency.
* Add setting to toggle on/off.
* Don't clear ranges when moving to another file.
* Fix bug: Line copying (alt+up/down) creates undoStops
    * Extension can also not catch up if it is done too much. Why? Operations taking too long?

Could do:
* Change the syntax.
* Make syntax configurable.
* Add optional left bar.
* Add optional pattern such as stripes to the background.
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