# State Contract

`PFState` persists local panel state under the key `pfpm.state.v22`.

## Core collections

- `photos`: source photos
- `items`: requested print sizes and quantities
- `media`: sheet type/orientation/margin/gap
- `options`: border, rotation, guides, grouping, artboards

`PFState.buildJob()` resolves `sourceId` to `sourcePath` and returns the job object consumed by `PFLayout.generate()`.
