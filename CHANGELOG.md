## [2.5.1]

- Fixed a crash and missing color blocks when the Todo Tree extension is installed.
- Use Cmd+K Cmd+B for the "Add Color Block" shortcut on macOS.

## [2.5.0]

- Fixed misaligned color blocks on tab-indented and mixed tab/space code.
- Added per-language overrides for the `enabled` and `autoUpdate` settings (e.g. disable color blocks for `[gitignore]`).
- Added a command to toggle automatic line-count updates.

## [2.4.0]

Major changes:

- Performance improvements. Should also prevent crashes.
- Enable rendering for side-by-side editors and other multi-editor layouts.
- Add better support for light themes.

Minor changes / fixes:

- Fixed shell-script false positives such as `${green}` and `${orangered}` being treated as color blocks.
- Fixed PowerShell line and block comment support.
- Fixed copy-line up/down shortcuts creating separate undo steps for automatic line-count updates.

## [v2.3.0]

Support languages without block commands. Improve debouncing with configurable interval. Hotfix visuals and default to wrapping enabled.

## [2.2.0]

Added support for named colors. Lowered supported vscode version.

## [2.1.0]

Fixed bug: Color block stretching outside of document crashed extension. Changed color-blocks.add command shortcut to ctrl+K ctrl+B since ctrl+C will remove copy shortcut.

## [2.0.0]

Major changes:

- Added support for block comments.
- Added command for enabling/disabling color-blocks (visibility).
- Changed behavior of color block arguments.
  - Specifying number of lines as the second argument is now optional.
    - If number of lines is not specified, then the color block will continue until an empty line.
  - Color blocks now always color the entire comment in which the color block commands are written.
  - Number of lines now refer to the number of lines *after the comment line/block* to include in the color block. (Breaking)
- The `color-blocks.add` command can now be called using `ctrl+C ctrl+B`.
- Added setting to enlarge the comment text (it still looks a little wonky).

Minor changes / fixes:

- Skip expanding color-block at the very end of the document.
- Color-blocks with lines extending beyond the document line count are now truncated.
- Made updating existing color blocks with newlines more robust and reliable.

## [1.0.6]

Improvements to performance.

This does however make the blocks a little less responsive but has the added benefit of not lagging down the entire editor.

## [1.0.5]

Fixed empty row affecting wrapping.

Updated readme.

## [1.0.4]

Bugfixes and removed logging.

## [1.0.3]

Fixed snippet and added examples.

## [1.0.2]

Testing new publishing method.

## [1.0.1]

Bug fix: Extension not working for many lanuages.

## [1.0.0]

First release 🥳 Straight out the oven baby!

## [0.0.0]

Pre release