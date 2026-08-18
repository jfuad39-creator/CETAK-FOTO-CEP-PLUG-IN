# Development Guide

## Prerequisites

- Windows + Adobe Illustrator 2021 (25.4.1) for validation
- CEP debug mode as normally used by the existing extension installation workflow
- Node.js is optional; repository scripts use only built-in Node APIs if available

## Build

```text
node scripts/build.js
```

Output: `dist/extension/`

The build copies `src/extension/` verbatim into `dist/extension/`. No source file is rewritten.

## Validate

```text
node scripts/validate.js
```

Validation checks:
- manifest exists and points to expected entry points
- referenced panel assets exist
- required modules exist
- generated output exists after build

## Install

Install **`dist/extension/`** using the same CEP installation/debug method used for the working version of the plugin.

## Debug order

1. `PFPM.ping()` / panel load
2. `PFState.buildJob()`
3. `PFLayout.generate(job)`
4. preview
5. `PFPM.generate()`
6. `selectionInfo()`
7. editor commands

## Regression smoke test

- open Illustrator 2021
- panel appears in Window > Extensions
- add 4x6 / 3x4 / 2x3 items
- preview A4 portrait
- generate to a new/open document
- select a generated slot
- nudge, crop, flip, rotate, replace, duplicate, delete
- undo
- verify no unexpected layer loss
