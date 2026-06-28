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

- Root `index.html`, `demo.html`, `events.html`, `constructor.html`, and `react.html` each contain one `#root` and one Vite module script.
- Root HTML files do not contain pasted SVG polygons, static gradient definitions, or page CSS.
- `src/pages` imports the reusable renderer/editor from `src/squircle`.
- `legacy-static/` is present in `.gitignore`.
- `docs/examples/README.md`, `docs/react/README.md`, and `docs/design/README.md` describe the current source of truth.
- Public API names use `text`, `textStyle`, and `textColor`; `GPU` appears only as example content or deprecated compatibility wording.

## Render Checks

Open the Vite dev server and inspect:

- `/index.html`: hero scene renders through React, palette buttons recolor it, and the single-state drawer can select a state.
- `/demo.html`: gallery renders many React-generated presets, clicking a preset updates the main scene, and hovering a squircle swaps only material/color state.
- `/events.html`: focused sibling-hover demo renders one three-layer scene, palette buttons recolor it, and function-valued `layer.hover` crossfades non-hovered layers to wireframe.
- `/constructor.html`: editor renders three default plain wireframe layers, supports layer add/delete/reorder/visibility, click selection, inspector deselection, theme switching, scene camera controls, per-layer geometry controls, palette controls, effect controls, grain controls, stroke controls, and generated React code copy.
- `/react.html`: mirrors the constructor page for compatibility.

Expected results:

- No page renders all-black squircles.
- Solid and transparent `metal` and `mesh` effects are clipped to the top face and animate without moving layer geometry.
- Solid and transparent `grain: true` variants show subtle multiply-blended grain only inside the top face, not across the scene background.
- Solid and transparent `metal` effects look projected onto the tilted top plane; no individual circular blob edges are visible in a paused frame.
- Solid and transparent `mesh` effects look like a smooth four-corner bilinear gradient; no hotspots, blobs, waves, or noise are visible.
- Geometry stays fixed when selection or hover changes.
- Camera level affects the whole scene and serializes as `geometry.angleDegrees`.
- Radius, height, and line-size edits affect only the selected layer and serialize into that layer's `geometry` object.
- Reloading `/constructor.html` restores layers, scene camera, theme, selection, and Code drawer state from localStorage.
- No hover state changes layer gaps, transforms, scale, shadows, filters, or halos.
- Function-valued `layer.hover` handles standard sibling hover without page-level layer rewriting.
- Layer event callbacks fire from the layer group and can still drive external UI state for custom interactions.
- Wireframe text uses one live SVG `<text>` element with gradient stroke, not duplicated label copies or primitive letter parts.
- Solid text uses readable filled text on the top plane.
- Line and text annotations stay glued to the top plane.
- Transparent SVG output keeps the body background transparent.

## Package Checks

- `npm run build` emits `dist/sqircle.js`, `dist/style.css`, and type declarations.
- `npm run build:demo` emits all five React-backed HTML pages.
- Generated constructor code imports `SquircleScene`, `SquircleLayerConfig`, and `@dstackai/sqircle/style.css`.
- `SquircleScene` accepts 0-N layers and `theme="light" | "dark"`.
- `SquircleScene` exposes layer click only; hover behavior is configured through `layer.hover`.
- `SquircleEditor` uses `SquircleScene` for preview and exports current React code.

## Geometry Checks

Confirm any visual change still follows the design docs:

- Superellipse points are generated from `src/squircle/geometry.ts`, not hand-written.
- Layer `geometry` may override only `exponent`, `prismHeight`, and `inlayScale`; shared camera/projection/viewBox settings remain scene-level.
- Front-facing side wall uses hidden-surface removal from the sampled superellipse normals.
- Gradients use `userSpaceOnUse` and palette constants from `src/squircle/palettes.ts`.
- Effects use the generated top polygon as the clip path.
- Effects author blob positions, blur, radius, and drift from local `halfSize`/`2 * halfSize`, then project the color field with the label/isometric matrix.
- Filled faces retain subtle same-family edge strokes.
- Wireframe, line, and label stroke widths remain configurable data.
