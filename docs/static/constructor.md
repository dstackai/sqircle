# Legacy Constructor Snapshot

This document is retained only as a pointer for the ignored legacy archive.

The current `constructor.html` is a Vite shell that mounts `src/pages/ConstructorPage.tsx`, which renders the reusable `SquircleEditor`. The editor now exports React code, not the old hand-coded JSON schema. For current behavior, read [../react/editor.md](../react/editor.md), [../react/README.md](../react/README.md), and [../examples/README.md](../examples/README.md).

The old static constructor was copied to `legacy-static/constructor.html` with `legacy-static/static/styles.css`. Do not edit that archive as source; migrate any useful behavior into `src/squircle/SquircleEditor.tsx`, `src/squircle/SquircleScene.tsx`, or `src/pages`.
