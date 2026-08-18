[README.md](https://github.com/user-attachments/files/31181085/README.md)
# Pas Foto Production Manager

Adobe Illustrator CEP extension for passport/photo-print production.

**Version:** 2.3.0

This repository is structured for **human developers and AI coding assistants**. The source is divided by responsibility while preserving the CEP runtime contract.

## Quick start for an AI

Read these in order:

1. `README.md`
2. `docs/AI_CONTEXT.md`
3. `docs/FILE_MAP.md`
4. `docs/ARCHITECTURE.md`
5. The smallest relevant source module

## Repository map

```text
pas-foto-production-manager/
├── CSXS/
│   └── manifest.xml
├── docs/
│   ├── AI_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── FILE_MAP.md
│   └── REFACTORING.md
├── src/
│   ├── client/
│   │   ├── index.html
│   │   ├── css/theme.css
│   │   ├── icons/
│   │   └── js/
│   │       ├── state.js
│   │       ├── bridge.js
│   │       ├── layout-engine.js
│   │       ├── core.js
│   │       ├── photos.js
│   │       ├── order.js
│   │       ├── preview.js
│   │       ├── generate.js
│   │       ├── editor.js
│   │       └── app.js
│   ├── host/
│   │   └── main.jsx
│   └── vendor/
│       └── CSInterface.js
├── tools/
│   └── validate-repo.py
├── .gitignore
├── VERSION
└── README.md
```

## Runtime entry points

- `CSXS/manifest.xml` — CEP registration and runtime entry points.
- `src/client/index.html` — panel DOM and browser script load order.
- `src/host/main.jsx` — Illustrator ExtendScript runtime.

## Client responsibilities

- `state.js` — state, defaults, persistence, job construction.
- `bridge.js` — browser ↔ Illustrator bridge.
- `layout-engine.js` — layout calculations only.
- `core.js` — shared UI helpers and `PFApp` module registry.
- `photos.js` — photo import/drop/remove/rename.
- `order.js` — sizes, quantities, print package, media options.
- `preview.js` — visual sheet preview.
- `generate.js` — generate/create/undo requests.
- `editor.js` — selection editing controls.
- `app.js` — bootstrap/orchestration; loads last.

## Why the host is still one file

`src/host/main.jsx` is intentionally **not** split into many ExtendScript files. Illustrator CEP uses an older ExtendScript/ES3 runtime, so host-side modularization can create global-scope and load-order regressions.

The safe boundary for the current refactor is the browser side.

## Validation

From the repository root:

```bash
python3 tools/validate-repo.py
```

The validator checks required files, manifest paths, client script order, and basic source integrity.

## Development rule

Make the smallest relevant change, preserve existing public APIs and DOM IDs, then validate before packaging.

`src/` and `CSXS/` are the source of truth. Release ZIPs are build artifacts.
