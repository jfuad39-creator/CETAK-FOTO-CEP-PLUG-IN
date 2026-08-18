# bridge.js

**Role:** the only explicit panel -> Illustrator host transport adapter.

It encodes JSON, calls `CSInterface.evalScript`, parses host responses, and exposes callback/Promise-style wrappers.
