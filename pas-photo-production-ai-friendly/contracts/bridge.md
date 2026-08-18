# Bridge Contract

## Direction

Panel JavaScript calls ExtendScript using:

```text
PFBridge.call(command, args, callback)
PFBridge.async(command, args)
```

which becomes:

```text
PFPM.<command>("<encoded JSON payload>")
```

## Response envelope

Expected host response shape:

```json
{
  "ok": true,
  "message": "...",
  "data": {}
}
```

Error responses use `ok: false` and a human-readable `message`.

## Compatibility rule

Do not add assumptions about Promises or modern APIs to `main.jsx`. Modern async behavior belongs on the panel side, where `bridge.js` can wrap callbacks.
