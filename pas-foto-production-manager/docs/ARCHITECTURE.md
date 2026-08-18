# Architecture

## High-level

```text
Illustrator
   │
   │ CEP / ExtendScript
   ▼
CSXS/manifest.xml
   │
   ├──────────────► src/host/main.jsx
   │                     │
   │                     └── Illustrator document/artwork operations
   │
   └──────────────► src/client/index.html
                         │
                         ├── state.js
                         ├── bridge.js ─────────► PFPM functions in main.jsx
                         ├── layout-engine.js
                         ├── core.js
                         ├── photos.js
                         ├── order.js
                         ├── preview.js
                         ├── generate.js
                         ├── editor.js
                         └── app.js
```

## Client modules

### `core.js`
Shared UI primitives and the `PFApp` service registry.

Owns:
- DOM selectors
- element creation
- escaping
- file URL conversion
- image extension detection
- numeric up/down spinner
- toast notifications

### `photos.js`
Photo source lifecycle:
- add photo
- remove photo
- rename photo
- drag/drop
- Illustrator file picker

### `order.js`
Print order lifecycle:
- size preset list
- order rows
- quantities
- source selection
- print package
- media options

### `layout-engine.js`
Pure layout calculation. It should not depend on DOM APIs.

### `preview.js`
Converts `PFLayout.generate()` output into browser preview elements.

### `generate.js`
Turns the current layout into a bridge request to Illustrator.

### `editor.js`
Selection-aware editing:
- nudge
- crop
- zoom
- duplicate
- flip
- rotate
- delete
- replace

### `app.js`
Bootstrap only. It initializes modules and starts periodic selection refresh.

## Host

`src/host/main.jsx` contains the Illustrator-side implementation of the bridge commands. It intentionally remains a single runtime file for CEP/ExtendScript safety.

## Data flow

```text
User input
   ↓
PFState
   ↓
PFLayout.generate(PFState.buildJob())
   ↓
Preview
   ↓
Generate request
   ↓
PFBridge.call("generate", payload)
   ↓
PFPM.generate(...)
   ↓
Illustrator document
```

Selection editing flows in the opposite direction:

```text
Illustrator selection
   ↓
PFBridge.call("selectionInfo")
   ↓
PFPM.selectionInfo(...)
   ↓
editor.js
   ↓
PFBridge.call("crop"/"rotate90"/...)
   ↓
PFPM command
```

## Refactoring boundary

The safest boundary is the browser/client side. The host file is the high-risk boundary because it is executed by Illustrator's ExtendScript engine.

If host modularization is eventually needed, use a source-module → build-output approach rather than asking Illustrator to dynamically load an arbitrary collection of files.
