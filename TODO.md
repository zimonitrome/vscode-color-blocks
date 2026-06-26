## TODO:

Should do:
* Project roadmap / memory, in priority order:
    * Fix decorations for all visible editors instead of only the active editor.
        * Addresses side-by-side editor visibility, especially issue #19.
        * Maintain one decoration handler per visible editor so disposing/redrawing one editor does not erase another.
        * Listen to `onDidChangeVisibleTextEditors` and refresh affected editors.
    * Extend automated verification.
        * Add stress cases for side-by-side visible editors.
        * Add shell and PowerShell documents for `${GREEN}` and `#` comment behavior.
        * Add huge single block, many tiny blocks, and overlapping block cases.
        * Add visual checks for dark/light themes if VS Code screenshots can be automated reliably.
    * Native rendering prototype was rejected.
        * It looked worse, lost wrapped/indent-aware block sizing, and was not faster in stress runs.
        * Do not add a native render mode unless VS Code exposes a better block decoration API later.
* Completed recently:
    * Debounced automatic line-count source edits.
        * Track pending count replacements across nearby edits.
        * Apply extension-owned count updates after typing settles.
    * Cached decoration types by style key.
        * Stress comparison for decoration type creation:
            * Many blocks: 600 -> 27.
            * Huge blocks: 40 -> 12.
            * Side-by-side: 240 -> 54.
* Update videos and images to show 2.0.0 behvaior
* Test performance on slow PCs.
* Don't clear ranges when moving to another file.
* Fix bug: Line copying (alt+up/down) creates undoStops
    * LOTS OF STUFF CREATES UNDOSTOPS! WHY??? WHY VSCODE?????

Could do:
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
* Support light theme better.
    * Make comments darker instead of brighter.
        * Change settings and variable to not say "brighter"/"lighter".
* Improve overlapping ranges text colors.
    * Currently the text looks bland as multiple ranges alpha blend.
* Add optional left bar.
* Add opacity to hex color (make 4/8 hex color len OK)
* Setting to store color ranges in a separate file. For `myfile.py` a 2nd file `myfile.py.cbc` would be used.
* Change wrap option to be separate for pre or post line. (shrink left and shrink right)

Probably won't do:
* Change the syntax.
* Make syntax configurable.
