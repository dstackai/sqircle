# Squircle

[![npm version](https://img.shields.io/npm/v/@dstackai/sqircle.svg)](https://www.npmjs.com/package/@dstackai/sqircle)
[![npm package](https://img.shields.io/npm/dm/@dstackai/sqircle.svg)](https://www.npmjs.com/package/@dstackai/sqircle)
[![license](https://img.shields.io/npm/l/@dstackai/sqircle.svg)](LICENSE)

Squircle is a React/TypeScript renderer for precise isometric squircle-prism SVG compositions. The reusable implementation lives in `src/squircle`; the root HTML files are Vite/React example shells that exercise the same renderer.

Use this repo when you need:

- `SquircleScene`: a configurable SVG renderer for 0-N squircle layers.
- A documented visual system for squircle geometry, gradients, wireframes, top-plane text, and dashed inlays.
- React-backed local examples for regression checks and agent handoff.

## Package

Install from npm:

```sh
npm install @dstackai/sqircle
```

Use the renderer and component CSS:

```tsx
import { SquircleScene, type SquircleLayerConfig } from "@dstackai/sqircle";
import "@dstackai/sqircle/style.css";
```

## Quick Start

For local development of this repo:

```sh
npm install
npm run dev
```

Open the Vite dev server and choose a page:

- `/index.html`: hero example plus single-squircle state drawer.
- `/demo.html`: selectable composition gallery.

For production checks:

```sh
npm run typecheck
npm run build
git diff --check -- .
```

## React Usage

```tsx
import { SquircleScene, type SquircleLayerConfig } from "@dstackai/sqircle";
import "@dstackai/sqircle/style.css";

const layers: SquircleLayerConfig[] = [
  {
    id: "bottom",
    offset: { y: 176 },
    base: { material: "wireframe", paletteId: "15" }
  },
  {
    id: "top",
    offset: { y: 0 },
    base: {
      material: "solid",
      paletteId: "15",
      effect: "fluid",
      text: "GPU",
      dash: true
    },
    hover: { material: "wireframe", paletteId: "20" }
  }
];

export function ExampleSquircle() {
  return <SquircleScene theme="light" layers={layers} />;
}
```

For the full renderer API, layer model, geometry, strokes, opacity, and palette fields, read [React Component Guide](docs/react/README.md).

## Options Reference

This is the package-level renderer API reference. Keep it synchronized with `docs/react/README.md` and `src/squircle/types.ts`.

### `SquircleScene`

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `layers` | `SquircleLayerConfig[]` | required | Draw-order layer array. First item is lowest/backmost; last item is topmost/frontmost. |
| `geometry` | `SquircleGeometryConfig` | `DEFAULT_GEOMETRY` | Scene-level geometry defaults, camera/projection, fitting, and viewBox settings. |
| `selectedLayerId` | `string \| null` | `null` | Marks a layer as selected for class/state styling. Does not move or restack layers. |
| `theme` | `light`, `dark` | `light` | Adds theme classes/data attributes for host styling while keeping the SVG background transparent. |
| `idPrefix` | `string` | generated React id | Prefix for SVG gradient ids. Use when deterministic ids are required. |
| `className` | `string` | none | Extra class on the root SVG. |
| `ariaLabel` | `string` | `Squircle scene` | Accessible label for the SVG. |
| `fitToLayers` | `boolean` | `true` | Expands the viewBox height to include visible layer offsets. |
| `transitionMs` | `number` | `220` | Hover crossfade duration in milliseconds. |
| `onLayerSelect` | `(layerId: string) => void` | none | Called when a rendered layer is clicked. |

### `SquircleLayerConfig`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | required | Stable layer id. |
| `visible` | `boolean` | `true` | Hidden layers are skipped without changing other offsets. |
| `offset` | `{ x?: number; y?: number }` | `{ x: 0, y: 0 }` | SVG translation for this layer. |
| `geometry` | `SquircleLayerGeometryConfig` | scene geometry | Per-layer radius, prism height, and dashed inlay scale. |
| `base` | `SquircleVariantConfig` | required | Normal layer state. |
| `hover` | `SquircleVariantConfig` | none | Hover state merged over `base`. If absent or identical, no hover copy is rendered. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Layer-wide stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Layer-wide opacity overrides. |
| `className` | `string` | none | Extra class on the layer group. |

### `SquircleVariantConfig`

Each layer has a required `base` variant and an optional `hover` variant. Hover is a state swap: the component renders a `.sq-hover` group only when the resolved hover variant differs from base. If hover is absent or identical, the layer has no `.sq-has-hover`, no hover copy, and no crossfade blink.

| Field | Values | Default | Meaning |
| --- | --- | --- | --- |
| `material` | `solid`, `transparent`, `wireframe` | `wireframe` | Prism rendering mode. |
| `paletteId` | `13` through `20` | `15` | Palette from `SQUIRCLE_PALETTES`. |
| `effect` | `off`, `fluid`, `frosted` | `off` | Solid-material top-face effect. Ignored by transparent and wireframe materials. |
| `text` | `string`, `boolean` | none | Render top-plane text. Pass a string such as `"GPU"` or `"{}"`; `true` is a compatibility shorthand for `"GPU"`. |
| `dash` | `boolean` | `false` | Render the dashed inlay. |
| `textStyle` | `solid`, `wireframe` | `solid` | Filled or outlined text. |
| `textColor` | `auto`, `white`, `black`, `contrast` | `contrast` | Text paint for solid/transparent material. `auto` and `contrast` currently resolve the same way. |
| `textSize` | `number` | `62` | Text font size. |
| `textFontFamily` | `string` | `Arial, Helvetica, sans-serif` | SVG text font family. |
| `textFontWeight` | `string`, `number` | `400` | SVG text font weight. |
| `dashColor` | `auto`, `white`, `black`, `contrast` | `contrast` | Dash paint for solid/transparent material. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Per-variant stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Per-variant opacity overrides. |

`auto` is the preferred value for palette-managed annotation paint. `contrast` remains a backwards-compatible alias and renders the same way. `gpu`, `gpuStyle`, and `gpuColor` are deprecated aliases accepted only for older snippets; new configs and generated code should use `text`, `textStyle`, and `textColor`.

### `SquircleLayerGeometryConfig`

Layer geometry overrides affect one squircle only. Use these fields when a composition needs mixed corner radius, prism height, or dashed-inlay proportion while keeping the shared scene projection.

| Field | Type | Inherits From | Meaning |
| --- | --- | --- | --- |
| `exponent` | `number` | `geometry.exponent` | Superellipse exponent for this layer. Lower is rounder, higher is squarer. |
| `prismHeight` | `number` | `geometry.prismHeight` | Extrusion height for this layer in SVG units. |
| `inlayScale` | `number` | `geometry.inlayScale` | Dashed inlay size relative to this layer's outer squircle. |

### `SquircleGeometryConfig`

Scene geometry supplies defaults for layers plus shared camera/projection/viewBox behavior. Prefer `layer.geometry` for per-layer radius, height, and dash size.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `width` | `number` | `800` | SVG viewBox width and geometry fitting target. |
| `viewBoxHeight` | `number` | `480` | Base SVG viewBox height before optional layer fitting. |
| `exponent` | `number` | `12` | Superellipse exponent. Lower is rounder, higher is squarer. |
| `samples` | `number` | `160` | Number of sampled superellipse points. |
| `halfSize` | `number` | computed from `width` | Raw superellipse half-size before projection. |
| `prismHeight` | `number` | `10` | Extrusion height in SVG units. |
| `angleDegrees` | `number` | `20` | Scene camera elevation angle. Lower values are more side-on; higher values show more of the top face. |
| `inlayScale` | `number` | `0.6` | Dashed inlay scale relative to the outer squircle. |
| `center` | `{ x: number; y: number }` | computed | Projection center. Override only when manually composing a custom viewBox. |

### `SquircleStrokeConfig`

| Field | Default | Meaning |
| --- | --- | --- |
| `face` | `0.35` | Hairline stroke for filled top and side faces. |
| `faceOpacity` | `0.72` | Opacity for filled-face strokes. |
| `wire` | `1.6` | Visible wireframe outline width. |
| `wireOpacity` | `0.88` | Visible wireframe outline opacity. |
| `hidden` | `1.2` | Hidden/back wireframe guide width. |
| `hiddenOpacity` | `0.28` | Hidden/back wireframe guide opacity. |
| `dash` | `2.2` | Dashed inlay width for solid/transparent material. |
| `wireDash` | `1.6` | Dashed inlay width for wireframe material. |
| `labelWire` | `1.1` | Outlined text stroke width. |

### `SquircleOpacityConfig`

| Field | Default | Meaning |
| --- | --- | --- |
| `transparentFace` | `0.38` | Face opacity for `material: "transparent"`. |
| `transparentAnnotation` | `0.62` | Text/dash opacity on transparent material. |
| `solidAnnotation` | `0.88` | Text/dash opacity on solid or wireframe material. |

### Palettes

`paletteId` accepts any id from `SQUIRCLE_PALETTE_IDS`: `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`. The palette object fields are:

| Field | Meaning |
| --- | --- |
| `id` | Stable palette id. |
| `label` | Human-readable palette name. |
| `top` | Top-face gradient stops. |
| `side` | Side-wall gradient stops. |
| `textWire` | Gradient stops used for outlined text. |
| `labelFill` | Automatic filled text/dash color. |
| `topEdge` | Top-face hairline stroke color. |
| `sideEdge` | Side-wall hairline stroke color. |
| `swatch` | Two-color UI swatch. |

`effect: "off"` uses the normal static top gradient. `fluid` and `frosted` clip animated blurred color fields to the top face, with the color field authored in local squircle-plane coordinates and projected through the same isometric matrix as text. `frosted` adds a screen-space pale veil and brighter rim. Effect colors are derived from the selected alpha palette.

## Surface Effects

Solid squircles can opt into animated top-surface effects with `effect: "fluid"` or `effect: "frosted"`. Both effects keep the prism geometry fixed: only the top face paint changes.

The color field is built in the flat squircle plane, blurred in that local coordinate system, and then projected onto the top face. The generated top polygon remains the screen-space clip path, while the frosted veil and rim stay screen-space overlays. This keeps the gradients reading as surface paint instead of flat circles floating above the prism.

Use [Rendering Contract](docs/design/rendering.md) for the exact ratios and SVG nesting rules before changing these effects.

## HTML Pages

The root HTML files are intentionally thin shells. They mount React entrypoints from `src/pages`, and those pages render examples built on the package components.

Legacy static snapshots from the exploration phase are archived under `legacy-static/`, which is ignored by git. Use them only as local visual references; new app work should use `@dstackai/sqircle` or the source components in `src/squircle`.

## Documentation Map

Start at [Documentation Index](docs/README.md). The docs are split by purpose:

- [React Component Guide](docs/react/README.md): how to use and configure `SquircleScene`.
- [Editor Guide](docs/react/editor.md): how to use the optional constructor UI and React code exporter.
- [Design Documentation](docs/design/README.md): geometry, rendering, color, annotation, wireframe, and single-squircle visual rules.
- [React Example Pages](docs/examples/README.md): `index.html`, `demo.html`, `constructor.html`, and `react.html` page contracts.
- [Legacy Static Snapshots](docs/static/README.md): local ignored snapshots kept for reference only.
- [Verification Checklist](docs/verification.md): static checks, render checks, and expected behavior.

## Repository Shape

| Path | Role |
| --- | --- |
| `src/squircle` | Main React/TypeScript component implementation |
| `src/pages` | React example pages mounted by the root HTML files |
| `index.html` | Vite shell for the React hero and single-state example |
| `demo.html` | Vite shell for the React composition gallery |
| `constructor.html` | Vite shell for the React constructor UI |
| `react.html` | Compatibility Vite shell for the constructor UI |
| `legacy-static/` | Ignored local archive of the former static HTML/CSS snapshots |
| `docs/` | Agent-facing component, design, example-page, and verification docs |

## Current Visual Defaults

- Superellipse: `n = 12`, `N = 160`, `a = 225.49`
- Prism height: `h = 10`
- Projection: `20deg`
- Dashed inlay scale: `60%`
- ViewBox: `0 0 800 480`
- Default palette: `15 Alpha`
- Default three-layer offsets: bottom `y = 176`, middle `y = 88`, top `y = 0`

## Hard Rules

- New reusable work should go through `src/squircle`.
- Component styles belong beside their components in `src/squircle`; example-page styles live under `src/pages`.
- Do not hand-edit generated prism, inlay, or hidden-edge coordinates; regenerate from [Geometry Contract](docs/design/geometry.md).
- Keep hover swaps opacity-only: no transform, scale, filter, halo, or layer-gap changes.
- Render top-plane text as one SVG text element on the projected top plane. Do not duplicate it for filled and wireframe states.
- Keep variant colors synchronized with [Color System](docs/design/colors.md).
- Keep animated top effects clipped to the generated full-resolution top polygon; annotations still draw above the effect.
- Keep fluid/frosted color fields in local top-plane coordinates before projection; do not place their blobs directly in screen space.
- Keep the body background transparent.
