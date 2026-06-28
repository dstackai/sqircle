# React Example Pages

The root HTML files are Vite shells. They should stay small and only mount React entrypoints from `src/pages`.

| HTML | React entrypoint | Purpose |
| --- | --- | --- |
| `index.html` | `src/pages/IndexPage.tsx` | Hero scene plus selectable single-squircle state drawer |
| `demo.html` | `src/pages/DemoPage.tsx` | Selectable generated gallery of 3-layer compositions |
| `events.html` | `src/pages/EventDemoPage.tsx` | Focused function-hover example with sibling wireframe state |
| `constructor.html` | `src/pages/ConstructorPage.tsx` | Full constructor UI using `SquircleEditor` |
| `react.html` | `src/pages/ConstructorPage.tsx` | Compatibility alias for the constructor |

## Source Files

- `src/pages/exampleData.ts`: shared preset and seed-layer constructors.
- `src/pages/PageShell.tsx`: shared page chrome and theme switch.
- `src/pages/pages.css`: example-page layout styles.

The examples must consume `SquircleScene`, `SquircleEditor`, palettes, and helpers from `src/squircle`. Do not paste generated SVG polygons or duplicate renderer logic in page files.

## Behavior

- `index.html` renders a main three-layer scene and a collapsed/openable drawer of single-squircle states. Palette buttons recolor the examples through React state.
- `demo.html` renders 96 generated composition presets, including alpha palettes, filled `off`/`metal`/`mesh` surfaces, and grained solid/transparent variants. Clicking a card changes the main hero composition. Each layer hover remains a state/color swap only.
- `events.html` is the minimal sibling-hover demo. It keeps one explicit three-layer scene and uses a shared `hover` resolver function so non-hovered layers crossfade to wireframe.
- `constructor.html` renders `SquircleEditor` with three default plain wireframe layers. The left panel exposes scene camera; the inspector exposes per-layer geometry, palette, effect, and grain controls. The Code panel exports React code using `@dstackai/sqircle` as the import path. It persists local editor state under `@dstackai/sqircle:constructor`.
- `react.html` intentionally mirrors `constructor.html` for older links.

## Rules

- Keep root HTML files as shells with one `#root` and one module script.
- Keep examples transparent-background friendly.
- Keep hover effects as opacity crossfades between base and hover variants. Do not add movement, shadows, scale, filters, or gap changes.
- Use function-valued `layer.hover` for sibling-hover interactions. Use layer events only when the host app needs external state outside the SVG.
- Keep all squircle geometry, palette, stroke, annotation, and theme behavior in the reusable component layer.
- If a legacy static behavior is still valuable, migrate it into `src/pages` or `src/squircle`; do not edit ignored snapshots as source.
