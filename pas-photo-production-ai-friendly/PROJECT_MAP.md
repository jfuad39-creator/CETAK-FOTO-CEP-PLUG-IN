# Project Map

## Module map

| Path | Role | Public boundary | Depends on |
|---|---|---|---|
| `src/extension/CSXS/manifest.xml` | CEP registration | extension entry point | `client/index.html`, `host/main.jsx` |
| `src/extension/client/index.html` | UI markup | DOM IDs/classes | `theme.css`, `CSInterface.js`, panel JS |
| `src/extension/client/css/theme.css` | visual system | CSS classes/IDs | DOM structure |
| `src/extension/client/js/app.js` | UI orchestration | DOM events, `PFState`, `PFLayout`, `PFBridge` | all panel modules |
| `src/extension/client/js/state.js` | client state | `PFState` | browser localStorage |
| `src/extension/client/js/bridge.js` | integration adapter | `PFBridge.call()` / `PFBridge.async()` | `CSInterface` |
| `src/extension/client/js/layout-engine.js` | layout domain | `PFLayout.generate()` | job object |
| `src/extension/host/main.jsx` | Illustrator domain | `PFPM.*` commands | Illustrator ExtendScript DOM |
| `src/extension/lib/CSInterface.js` | CEP utility layer | `CSInterface` | CEP APIs |

## Command inventory

### Host commands (`PFPM`)

- `createDocument`
- `generate`
- `ungroupAll`
- `selectionInfo`
- `nudge`
- `crop`
- `flip`
- `rotate90`
- `replacePhoto`
- `duplicateSlot`
- `deleteSlot`
- `undo`
- `pickFiles`
- `fromSelection`
- `docInfo`
- `ping`

### Panel public objects

- `PFState`
- `PFBridge`
- `PFLayout`

## UI -> JS dependency rule

`index.html` IDs are part of the UI contract because `app.js` queries them directly. When changing HTML IDs/classes, search `app.js` before editing.

## Build source of truth

Only modify files below `src/extension/`. Everything in `dist/` is generated.
