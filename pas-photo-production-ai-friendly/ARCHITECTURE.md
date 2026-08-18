# Architecture

## Layered model

```text
┌─────────────────────────────────────────────┐
│ CEP Manifest                                │
│ CSXS/manifest.xml                           │
└─────────────────┬───────────────────────────┘
                  │ loads
┌─────────────────▼───────────────────────────┐
│ Panel / UI                                  │
│ client/index.html + theme.css + app.js      │
├─────────────────────────────────────────────┤
│ State & Layout                              │
│ state.js + layout-engine.js                 │
├─────────────────────────────────────────────┤
│ CEP Adapter                                 │
│ bridge.js + lib/CSInterface.js              │
└─────────────────┬───────────────────────────┘
                  │ evalScript("PFPM.*")
┌─────────────────▼───────────────────────────┐
│ Illustrator Host                            │
│ host/main.jsx                               │
│ document / layers / groups / placed images  │
└─────────────────────────────────────────────┘
```

## Why the structure stays CEP-native

The manifest refers directly to `./client/index.html` and `./host/main.jsx`. Keeping a CEP-shaped canonical package reduces a class of deployment failures that occur when repository organization is optimized without respecting runtime paths.

## Main orchestration sequence

`app.js` is the composition root for panel behavior. `state.js` owns input state; `layout-engine.js` is a pure-ish calculator; `bridge.js` is the only panel-to-host adapter; `main.jsx` performs Illustrator mutations.

## Metadata strategy

`main.jsx` attaches metadata to Illustrator items and uses it to resolve slots/selections. Treat that metadata as persistent application data even though it lives inside an Illustrator document.
