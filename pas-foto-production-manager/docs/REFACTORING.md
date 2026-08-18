# Refactoring Notes — v2.3.0 AI-friendly structure

## What changed

The browser-side controller was split by responsibility:

- `app.js` → bootstrap
- `core.js` → shared helpers/services
- `photos.js` → photo source UI
- `order.js` → order/options UI
- `preview.js` → preview renderer
- `generate.js` → Illustrator generation commands
- `editor.js` → selection editor

The existing state, bridge, and layout modules were retained.

## What was deliberately not changed

- ExtendScript runtime architecture
- `PFPM` public command names
- CEP manifest identifiers
- Illustrator metadata strategy
- layout algorithms
- DOM IDs
- visual CSS rules
- image assets

This makes the refactor primarily structural, reducing the chance of changing plugin behavior.

## Compatibility checks performed

- Browser JavaScript modules pass Node syntax validation.
- `main.jsx` passes syntax validation after temporarily neutralizing the Illustrator `#target` directive.
- Manifest entry paths were preserved and checked against the new source tree.
- Client script order was explicitly defined and documented.

## Important future rule

Do not delete the old architecture or split the host file further merely to make the repository look cleaner. Refactor only when there is a concrete maintenance benefit and a testable build/release path.
