# AI Context — Pas Foto Production Manager

## Mission
This repository is an Adobe Illustrator CEP extension for passport/photo-print production. It is intentionally structured so an AI coding assistant can locate the smallest relevant module before editing code.

## First-read order
1. `README.md`
2. `docs/AI_CONTEXT.md`
3. `docs/FILE_MAP.md`
4. `docs/ARCHITECTURE.md`
5. The smallest affected source module

## Runtime contract
`CSXS/manifest.xml` is the package entry point.

```text
CSXS/manifest.xml
├── client → src/client/index.html
│   ├── CSInterface.js
│   ├── state.js
│   ├── bridge.js
│   ├── layout-engine.js
│   ├── core.js
│   ├── photos.js
│   ├── order.js
│   ├── preview.js
│   ├── generate.js
│   ├── editor.js
│   └── app.js
└── host → src/host/main.jsx
```

### Browser/client module contract
The browser modules communicate through `window.PFApp`.

- `core.js` creates `PFApp` and exposes shared helpers/services.
- `photos.js` owns photo-source UI and drag/drop.
- `order.js` owns print-order rows, presets, and media/options binding.
- `preview.js` owns DOM rendering of the calculated layout.
- `generate.js` owns commands that ask Illustrator to create/update artwork.
- `editor.js` owns selection/edit controls for generated artwork.
- `app.js` is the bootstrap/orchestrator and must load last.

Existing services:
- `PFState` → `state.js`
- `PFBridge` → `bridge.js`
- `PFLayout` → `layout-engine.js`
- `PFApp` → UI orchestration/modules

## Host contract
`src/host/main.jsx` is intentionally kept as one ExtendScript entry file.

### Why it is not split yet
CEP calls the file through `ScriptPath`, and Illustrator's ExtendScript engine has older ES3/global-scope behavior. Splitting the host into `evalFile()` modules can introduce load-order, global-scope, and deployment regressions.

**Do not split `main.jsx` casually.** If host modularization is requested, create a build step that produces one verified runtime `main.jsx`, then validate the generated package before release.

## Golden rules
1. Preserve CEP compatibility.
2. Preserve script load order in `src/client/index.html`.
3. Preserve public bridge function names in `PFPM`.
4. Preserve `PFState`, `PFBridge`, `PFLayout`, and `PFApp` contracts unless the change explicitly requires an API change.
5. Do not change the layout algorithm while fixing a UI issue.
6. Keep ExtendScript compatible with Illustrator's ES3 engine.
7. Prefer the smallest relevant module.
8. Do not minify source.
9. Never commit `node_modules`, build cache, temporary files, or release artifacts as source.
10. Check `CSXS/manifest.xml` whenever a path moves.
11. Keep `CSXS/manifest.xml` at the package root of an installable CEP package.
12. Test in Illustrator after runtime-affecting changes.

## Change routing
Use this map before editing:

| User asks about | Start here |
|---|---|
| Parameter arrows/spinners | `src/client/js/core.js` + `src/client/js/order.js` |
| Photo import/drop | `src/client/js/photos.js` |
| Print quantities/sizes/options | `src/client/js/order.js` + `state.js` |
| A4/A5 packing or placement | `src/client/js/layout-engine.js` |
| Preview appearance | `src/client/js/preview.js` + `theme.css` |
| Generate into Illustrator | `src/client/js/generate.js` + `src/host/main.jsx` |
| Select/crop/rotate/replace/delete | `src/client/js/editor.js` + relevant `PFPM` function |
| Illustrator object generation | `src/host/main.jsx` |
| CEP panel registration/loading | `CSXS/manifest.xml` + `index.html` |

## Safe refactoring policy
Refactoring should preserve behavior first and improve structure second.

Preferred:
- split browser-side responsibilities into modules
- preserve existing public objects and function names
- keep DOM IDs stable
- keep host bridge command names stable
- add documentation and validation

Avoid without explicit request:
- changing layout math
- changing metadata schema stored in Illustrator `.note`
- changing CEP manifest IDs
- changing file formats
- replacing ExtendScript APIs
- introducing a framework/build system just for cosmetic cleanup

## AI workflow
For every change:
1. Identify the user-visible behavior.
2. Identify the module responsible.
3. Read its direct dependencies.
4. Search for the function/API name across the repository.
5. Make the smallest change.
6. Run repository validation.
7. Check JavaScript syntax where possible.
8. Update documentation if the architecture changes.
9. Package a fresh ZIP only after validation.

## Source of truth
`src/`, `CSXS/`, and documentation are source files.

A release ZIP is an artifact. Do not make edits only inside a ZIP and then treat it as the canonical source.
