# Geometry Contract

This file documents how to reproduce the squircle-prism coordinates in `index.html`. The SVG point lists are generated data. Do not hand-edit prism, inlay, or hidden-edge coordinates.

## Current Parameters

- Superellipse exponent: `n = 12`
- Samples: `N = 160`
- Half-size: `a = 225.49`
- Prism height: `h = 10`
- Camera elevation: `ANG = 20deg`
- Horizontal projection: `cosA = 0.9396926207859084`
- Vertical projection: `sinA = 0.3420201433256687`
- Computed center: `cx = 400`, `cy = 155.59`
- Top-plane origin: `(400, 145.6)`, which is `(cx, cy - h)`
- SVG viewBox: `0 0 800 480`
- Generated top-face bbox: `x = 0..800`, `y = 0..291.18`
- Generated side/wire bbox: `x = 0..800`, `y = 145.59..301.18`
- Layer offsets: bottom `translate(0 176)`, middle `translate(0 88)`, top `translate(0 0)`
- Inlay scale: `0.6 * a`

The high exponent makes the squircle much squarer than a standard `n = 4` squircle. The `20deg` elevation is the low-angle isometric projection currently used by both the prism and label/inlay transforms.

## Superellipse Outline

Generate the outline by sampling a full turn:

```js
const t = (2 * Math.PI * i) / N;
const c = Math.cos(t);
const s = Math.sin(t);

const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
const y = a * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
```

For the current design, `i` runs from `0` to `159`.

## Projection

Project every outline point twice, once at the prism top and once at the bottom:

```js
const sx = cx + (x - y) * cosA;
const sy = cy + (x + y) * sinA - z;
```

Solve `a` so the projected width is exactly `800`:

```js
const unitScreenX = unitPoints.map((p) => (p.x - p.y) * cosA);
const unitWidth = Math.max(...unitScreenX) - Math.min(...unitScreenX);
const a = 800 / unitWidth;
```

Then solve the center values:

```js
const screenX = points.map((p) => (p.x - p.y) * cosA);
const screenY = points.map((p) => (p.x + p.y) * sinA);

const cx = -Math.min(...screenX);
const cy = h - Math.min(...screenY);
```

## Visible Side Wall

Only the front-facing half of the prism wall is drawn. For every sampled point, compute the superellipse outward normal direction:

```js
const nx = Math.sign(c) * Math.pow(Math.abs(c), (2 * (n - 1)) / n);
const ny = Math.sign(s) * Math.pow(Math.abs(s), (2 * (n - 1)) / n);
```

A segment belongs to the visible front wall when:

```js
nx + ny >= 0
```

The side wall polygon is built from:

```text
top visible points in order
bottom visible points in reverse order
```

Rotate the sampled array if needed so the selected front-facing indices are emitted as one uninterrupted run. Do not emit separate left/right wall pieces; that makes the vertical sides drift away from the real silhouette tips.

The complementary back-bottom edge is emitted as `ghost-hidden` and is only shown in wireframe mode.

## Generated React Geometry

`src/squircle/geometry.ts` returns the geometry consumed by `SquircleScene`:

- `topPoints`: lit top-face polygon.
- `wallPoints`: one continuous front side-wall polygon.
- `hiddenPoints`: back/bottom edge used only in wireframe mode.
- `inlayPoints`: top-plane dashed squircle polygon.
- `labelTransform`: `matrix(cosA, sinA, -cosA, sinA, cx, cy - h)` for live SVG text.
- `topBounds` and `sideBounds`: gradient coordinate boxes.

`SquircleScene.geometry` supplies scene-level defaults and shared camera/projection/viewBox settings. `angleDegrees` is the scene camera elevation and must stay shared by all layers. A layer may override `exponent`, `prismHeight`, and `inlayScale` through `layer.geometry`; those overrides regenerate only that layer's prism, inlay, clip path, and effect filters. Layer offsets remain explicit and are not recalculated by selection, hover, or geometry changes.

## Regeneration Checklist

When changing geometry, update the generator and keep these in sync:

- `DEFAULT_GEOMETRY` in `src/squircle/geometry.ts`.
- `SquircleScene` gradient definitions in `src/squircle/SquircleScene.tsx`.
- Example dimensions in `src/pages`.
- Docs in [rendering.md](./rendering.md) and [single-squircle-states.md](./single-squircle-states.md).
- Legacy snapshots only if you intentionally refresh `legacy-static/`.

For small visual changes:

- Increase `n` for squarer corners and a smaller visible radius.
- Decrease `n` for softer, rounder corners.
- Decrease `ANG` to make the view less top-down.
- Increase `ANG` to show more of the top face.
- Increase `h` to make the prism side taller.
