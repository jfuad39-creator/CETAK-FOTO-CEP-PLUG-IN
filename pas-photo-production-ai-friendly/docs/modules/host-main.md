# host/main.jsx

**Role:** Illustrator-side application service.

It receives `PFPM.*` commands and mutates Illustrator documents, layers, artboards, groups, placed images, clipping masks, crop/rotation state, and selection/editor state.

Because this is an ExtendScript entry point, preserve compatible syntax and global loading semantics.
