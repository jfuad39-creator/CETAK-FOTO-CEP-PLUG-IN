# app.js

**Role:** panel composition root.

Responsibilities: render photos/items, bind form events, invoke layout preview, invoke host generation, refresh selection/editor UI, and dispatch slot edit commands.

**Do not move domain calculations here** when they can live in `layout-engine.js` or `state.js`.
