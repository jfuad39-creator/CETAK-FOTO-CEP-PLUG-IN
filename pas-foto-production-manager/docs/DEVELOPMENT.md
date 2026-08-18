# Development

## Before editing

1. Read `README.md`.
2. Read `docs/AI_CONTEXT.md`.
3. Read `docs/FILE_MAP.md` and `docs/ARCHITECTURE.md` if the change crosses modules.
4. Inspect the smallest relevant dependency chain.
5. Run `python3 tools/validate-repo.py`.

## After editing

1. Run `python3 tools/validate-repo.py`.
2. Syntax-check browser JavaScript with Node when available.
3. Syntax-check `src/host/main.jsx` with the Illustrator `#target` directive temporarily neutralized when using a generic JavaScript parser.
4. Test the extension in Illustrator for runtime-affecting changes.
5. Update documentation when architecture or behavior changes.

## CEP packaging rule

An installable CEP package must keep:

```text
CSXS/manifest.xml
```

at the package root.

The repository may contain a `src/` directory, but the package layout must match the paths declared in `CSXS/manifest.xml`.

## Safe refactoring

Prefer browser-side module refactoring. Do not split `main.jsx` into dynamically loaded files unless a verified build system is introduced that produces one final ExtendScript entry file.
