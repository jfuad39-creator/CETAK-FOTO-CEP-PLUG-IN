# File Map

| Path | Responsibility | Risk |
|---|---|---|
| `CSXS/manifest.xml` | CEP registration, entry points, panel geometry | High |
| `src/client/index.html` | Panel DOM and script load order | High |
| `src/client/css/theme.css` | UI styling | Medium |
| `src/client/js/state.js` | State/defaults/persistence/job building | High |
| `src/client/js/bridge.js` | Client ↔ Illustrator bridge | High |
| `src/client/js/layout-engine.js` | Layout calculations | High |
| `src/client/js/core.js` | Shared UI helpers + PFApp registry | Medium |
| `src/client/js/photos.js` | Photo source UI | Medium |
| `src/client/js/order.js` | Order/options UI | Medium |
| `src/client/js/preview.js` | Layout preview renderer | Medium |
| `src/client/js/generate.js` | Generate/create/undo commands | High |
| `src/client/js/editor.js` | Selection editing controls | High |
| `src/host/main.jsx` | Illustrator ExtendScript runtime | Very High |
| `src/vendor/CSInterface.js` | CEP API compatibility layer | Very High |
| `docs/AI_CONTEXT.md` | AI operating instructions | Low |
| `docs/ARCHITECTURE.md` | Architecture/data flow | Low |
| `tools/validate-repo.py` | Static repository validation | Low |

## Client script load order

1. `../vendor/CSInterface.js`
2. `js/state.js`
3. `js/bridge.js`
4. `js/layout-engine.js`
5. `js/core.js`
6. `js/photos.js`
7. `js/order.js`
8. `js/preview.js`
9. `js/generate.js`
10. `js/editor.js`
11. `js/app.js`

`app.js` must remain last because it performs application initialization.
