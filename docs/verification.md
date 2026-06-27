# Verification Checklist

Use this before handing work back to a user or another agent.

## Commands

```sh
npm run typecheck
npm run build
npm run build:demo
git diff --check -- .
```

## Source Checks

- Root `index.html`, `demo.html`, `constructor.html`, and `react.html` each contain one `#root` and one Vite module script.
- Root HTML files do not contain pasted SVG polygons, static gradient definitions, or page CSS.
- `src/pages` imports the reusable renderer/editor from `src/squircle`.
- `legacy-static/` is present in `.gitignore`.
- `docs/examples/README.md`, `docs/react/README.md`, and `docs/design/README.md` describe the current source of truth.
- Public API names use `text`, `textStyle`, and `textColor`; `GPU` appears only as example content or deprecated compatibility wording.

## Render Checks

Open the Vite dev server and inspect:

- `/index.html`: hero scene renders through React, palette buttons recolor it, and the single-state drawer can select a state.
- `/demo.html`: gallery renders many React-generated presets, clicking a preset updates the main scene, and hovering a squircle swaps only material/color state.
- `/constructor.html`: editor renders three default plain wireframe layers, supports layer add/delete/visibility, click selection, theme switching, stroke controls, and generated React code copy.
- `/react.html`: mirrors the constructor page for compatibility.

Expected results:

- No page renders all-black squircles.
- Geometry stays fixed when selection or hover changes.
- No hover state changes layer gaps, transforms, scale, shadows, filters, or halos.
- Wireframe text uses one live SVG `<text>` element with gradient stroke, not duplicated label copies or primitive letter parts.
- Solid text uses high-contrast filled text on the top plane.
- Dash and text annotations stay glued to the top plane.
- Transparent SVG output keeps the body background transparent.

## Package Checks

- `npm run build` emits `dist/sqircle.js`, `dist/style.css`, and type declarations.
- `npm run build:demo` emits all four React-backed HTML pages.
- Generated constructor code imports `SquircleScene`, `SquircleLayerConfig`, and `@dstackai/sqircle/style.css`.
- `SquircleScene` accepts 0-N layers and `theme="light" | "dark"`.
- `SquircleEditor` uses `SquircleScene` for preview and exports current React code.

## Geometry Checks

Confirm any visual change still follows the design docs:

- Superellipse points are generated from `src/squircle/geometry.ts`, not hand-written.
- Front-facing side wall uses hidden-surface removal from the sampled superellipse normals.
- Gradients use `userSpaceOnUse` and palette constants from `src/squircle/palettes.ts`.
- Filled faces retain subtle same-family edge strokes.
- Wireframe, dash, and label stroke widths remain configurable data.
