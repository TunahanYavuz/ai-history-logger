# Welcome to AI History Logger Source Code

## What's in the folder

* This folder contains all of the files necessary for the extension.
* `package.json` - The manifest file where we declare our commands (`ai-history.start`, `ai-history.save`, `ai-history.rollback`), UI buttons, and keybindings.
* `src/extension.ts` - The heart of the extension. It contains the implementation of the Shadow Git mechanics, the asynchronous `child_process` executions, the Markdown parser, and the i18n dictionary.

## Architecture Overview

Instead of reinventing the wheel with complex file-system diffing algorithms, this extension uses a brilliant **Shadow Git** approach:
1. `takeSnapshot()` creates a temporary `.ai-shadow/.git` repo and commits the current workspace state.
2. `saveChanges()` stages new AI modifications, runs `git diff`, and creates a rollback `.patch` file alongside a readable Markdown summary.
3. `rollbackChanges()` applies `git apply --reverse` using the generated patch to instantly undo AI changes.

## Get up and running straight away

* Press `F5` to open a new window with your extension loaded in the Extension Development Host.
* Run the snapshot command by pressing `Ctrl+Alt+A` (or `Cmd+Alt+A` on Mac).
* Modify a file to simulate AI behavior, then press `Ctrl+Alt+S` to capture the diff and enter your prompt.
* Open the generated `.ai-history/.../AI_Summary.md` file and click the Revert button in the top right to test the rollback feature.
* Set breakpoints in `src/extension.ts` to debug the terminal commands.

## Make changes

* You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
* You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code Sandbox window to load your latest TypeScript changes.

## Explore the API

* You can open the full set of our API when you open the file `node_modules/@types/vscode/index.d.ts`.

## Go further

* [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the VS Code extension marketplace using `vsce package`.