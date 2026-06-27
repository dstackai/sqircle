# Design Documentation

Read these files when changing how a squircle looks. They are visual contracts shared by the React component and the static fixtures.

| File | Purpose |
| --- | --- |
| [geometry.md](./geometry.md) | Superellipse sampling, projection, side-wall visibility, layer offsets, regeneration checklist |
| [rendering.md](./rendering.md) | Gradients, edge sharpness, draw order, dashed inlay, text path and paint rules |
| [colors.md](./colors.md) | Alpha palettes, text contrast colors, edge colors, hover palette rules |
| [single-squircle-states.md](./single-squircle-states.md) | Reusable one-squircle state recipes for solid, transparent, wireframe, text, dash, and text + dash |

## Design Source Of Truth

- Geometry is generated from math, not hand-edited point lists.
- Filled faces use user-space gradients plus tiny in-family edge strokes.
- Solid faces can use `off`, `fluid`, or `frosted` top-surface effects without moving geometry.
- Wireframe faces use gradient strokes with matching top and bottom curves.
- React top-plane text is one live SVG text element in every mode. Static fixtures keep a single compound `GPU` path for their fixed example.
- Solid/transparent annotations use contrast colors; wireframe annotations use wire gradients.

If a visual change affects reusable rendering, update `src/squircle` and these design docs together.
