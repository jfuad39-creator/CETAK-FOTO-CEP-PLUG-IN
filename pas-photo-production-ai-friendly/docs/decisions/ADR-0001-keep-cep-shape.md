# ADR-0001 — Keep CEP package shape as canonical source

## Decision

Keep the deployable CEP folder layout intact under `src/extension/` instead of immediately splitting runtime files by abstract domain folders.

## Reason

The manifest, panel script load order, and host entry point are tightly coupled to CEP. The repository needs better context more than it needs a risky runtime refactor.

## Consequence

The repository can become AI-friendly through explicit metadata, docs, contracts, and validation first. Deeper code decomposition can be performed later as a separate change set.
