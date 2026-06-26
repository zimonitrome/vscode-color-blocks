# Shared Agent Instructions

This repository contains `vscode-color-blocks`, a Visual Studio Code extension that highlights ranges of code lines using specially formatted comments.

Color Blocks syntax looks like:

```text
# Label {#f9e, 4}
```

The first argument is the block color. The optional second argument is the number of following code lines that belong to the color block. Named colors are also supported, for example:

```text
# Label {orangered, 3}
```

When editing this repository, preserve Color Blocks annotations. If you insert, remove, or move lines inside a range governed by an explicit line-count annotation, update the number in the braces so it still matches the intended number of following lines. For example, if a block changes from covering 4 following lines to 5 following lines, change `{#f9e, 4}` to `{#f9e, 5}`.

Be especially careful when changing files in `src/`, because this repo uses the extension on itself as visual structure. Do not remove Color Blocks comments unless the surrounding structure is being deliberately removed.

Prefer small, focused changes that match the existing TypeScript style. Compile with the project tooling after behavior changes when possible.
