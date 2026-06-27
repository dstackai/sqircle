# Agent Instructions

## Git And Publishing

- Do not commit, tag, push, publish, or otherwise mutate remote state without clear user consent for that exact action.
- Consent for one action does not imply consent for the next. For example, approval to edit files is not approval to commit; approval to commit is not approval to push; approval to publish npm is not approval to push Git.
- Before any commit, push, tag, or publish, summarize what will be included and wait for explicit confirmation.
- Prefer read-only git and package-registry commands unless the user has clearly authorized a write operation.

## Project Focus

- `README.md` documents the main `SquircleScene` renderer and its public scene configuration.
- `docs/react/editor.md` documents the optional `SquircleEditor` constructor UI and code-export workflow.
- Keep renderer docs and editor docs separate unless the user explicitly asks to merge them.
