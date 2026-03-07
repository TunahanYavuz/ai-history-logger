# AI History Logger

AI History Logger is a powerful, developer-first VS Code extension designed to track, visualize, and safely revert code changes made by AI assistants without touching your project's main Git history.

By utilizing a hidden "Shadow Git" architecture, it allows you to take snapshots before the AI modifies your code, records your prompts, and provides a beautiful Before/After Markdown summary. Best of all, if the AI breaks your code, you can revert it instantly with a single click.

## Features

* **Shadow Git Architecture:** Takes an isolated snapshot of your workspace in a `.ai-shadow` folder. It never conflicts with your main `.git` repository.
* **Smart Diff & Prompt Logging:** Generates a clean `AI_Summary.md` file featuring the prompt you used and a syntax-highlighted Before/After view of the modified lines.
* **Time Machine (1-Click Rollback):** Did the AI hallucinate? Just click the **Revert** `$(history)` button in the summary file to instantly restore your files to their original state using reverse patching.
* **Auto-Save & Zero Friction:** Automatically saves your pending files before taking snapshots to ensure accurate diffs.
* **Native i18n Support:** Fully supports English and Turkish native UI messages based on your VS Code language settings.

> Tip: Use the editor title buttons in the top right corner: `$(record)` to start a snapshot, `$(save)` to save AI changes, and `$(history)` inside a summary file to revert!

## Requirements

* **Git CLI:** This extension relies on the Git engine to calculate diffs and apply reverse patches. Git must be installed and accessible in your system's environment variables (terminal).

## Extension Settings

This extension is designed to work out-of-the-box with zero configuration. Currently, it does not contribute any specific settings to the VS Code settings UI. 

*Note: It automatically ignores `.git`, `.ai-shadow`, `node_modules`, `target`, and `.env` folders by default to maintain peak performance.*

## Known Issues

* If you manually modify a file *after* the AI has changed it, but *before* you hit the Rollback button, the reverse patch might fail due to Git merge conflicts. It is recommended to rollback immediately if you don't like the AI's output.

## Release Notes

### 0.0.1
* Initial MVP release.
* Introduced Shadow Git snapshot mechanics.
* Added Prompt Input Box with focus lock (`ignoreFocusOut`).
* Added Markdown parser with dynamic language detection.
* Added Time Machine (Rollback) via `.patch` files.

---

## Following extension guidelines

This extension was built following the [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines) to ensure a seamless integration with VS Code's native interface.