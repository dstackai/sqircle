# Squircle

[![npm version](https://img.shields.io/npm/v/@dstackai/sqircle.svg)](https://www.npmjs.com/package/@dstackai/sqircle)
[![npm package](https://img.shields.io/npm/dm/@dstackai/sqircle.svg)](https://www.npmjs.com/package/@dstackai/sqircle)
[![license](https://img.shields.io/npm/l/@dstackai/sqircle.svg)](LICENSE)

Squircle is a React/TypeScript renderer for precise isometric squircle-prism SVG compositions. The reusable implementation lives in `src/squircle`; the root HTML files are Vite/React example shells that exercise the same renderer.

Use this repo when you need:

- `SquircleScene`: a configurable SVG renderer for 0-N squircle layers.
- A documented visual system for squircle geometry, gradients, wireframes, top-plane text, and top-plane line inlays.
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
- `/events.html`: focused function-hover demo where sibling layers become wireframe on hover.

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
      effect: "metal",
      text: "GPU",
      line: "dashed"
    },
    hover: { material: "wireframe", paletteId: "20" }
  }
];

export function ExampleSquircle() {
  return <SquircleScene theme="light" layers={layers} />;
}
```

`hover` can also be a function. Use that when one hovered layer should change other layers:

```tsx
const siblingWireframeHover = ({ layer, hoveredLayerId }) => {
  if (layer.id === hoveredLayerId) return false;

  return {
    material: "wireframe"
  };
};

const layers = [
  {
    id: "bottom",
    base: { material: "solid", paletteId: "15" },
    hover: siblingWireframeHover
  },
  {
    id: "top",
    base: { material: "solid", paletteId: "15", text: "GPU" },
    hover: siblingWireframeHover
  }
];
```

The resolver runs for each visible layer. Its return value is shallow-merged over that layer's `base`, so include only the fields you want to change. In the example above, sibling layers keep their palette, text, line, geometry, and stroke settings; only `material` is temporarily enforced as `wireframe`. Return `false`, `null`, or `undefined` to leave a layer unchanged.

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
| `onLayerClick` | `(event: SquircleLayerClickEvent) => void` | none | Called on layer click with `{ layerId, layer, index, layerElement, event }`. |

### `SquircleLayerConfig`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | required | Stable layer id. |
| `visible` | `boolean` | `true` | Hidden layers are skipped without changing other offsets. |
| `offset` | `{ x?: number; y?: number }` | `{ x: 0, y: 0 }` | SVG translation for this layer. |
| `geometry` | `SquircleLayerGeometryConfig` | scene geometry | Per-layer radius, prism height, and line-inlay scale. |
| `base` | `SquircleVariantConfig` | required | Normal layer state. |
| `hover` | `SquircleVariantConfig \| SquircleLayerHoverResolver` | none | Hover state. Use an object for this layer's own hover; use a function to calculate hover state for each layer based on the currently hovered layer. Hover objects and resolver returns are shallow-merged over `base`, so omitted fields stay unchanged. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Layer-wide stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Layer-wide opacity overrides. |
| `className` | `string` | none | Extra class on the layer group. |

### `SquircleVariantConfig`

Each layer has a required `base` variant plus an optional `hover` variant. `hover` can be an object shallow-merged over `base`, or a resolver function that returns a variant to shallow-merge over the resolved layer's `base`.

| Field | Values | Default | Meaning |
| --- | --- | --- | --- |
| `material` | `solid`, `transparent`, `wireframe` | `wireframe` | Prism rendering mode. |
| `paletteId` | `13` through `20` | `15` | Palette from `SQUIRCLE_PALETTES`. |
| `effect` | `off`, `metal` | `off` | Top-face surface effect for solid and transparent materials. Ignored by wireframe material. |
| `text` | `string`, `false` | none | Render top-plane text. Pass a string such as `"GPU"` or `"{}"`; pass `false` in a hover variant to hide inherited text. |
| `line` | `solid`, `dotted`, `dashed`, `false` | `false` | Render a top-plane inner line. |
| `textStyle` | `solid`, `wireframe` | `solid` | Filled or outlined text. |
| `textColor` | `auto`, `white`, `black` | `auto` | Text paint for solid/transparent material. `auto` uses the palette annotation color. |
| `textSize` | `number` | `62` | Text font size. |
| `textFontFamily` | `string` | `Arial, Helvetica, sans-serif` | SVG text font family. |
| `textFontWeight` | `string`, `number` | `400` | SVG text font weight. |
| `lineColor` | `auto`, `white`, `black` | `auto` | Line paint for solid/transparent material. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Per-variant stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Per-variant opacity overrides. |

`auto` is the palette-managed annotation paint. On solid and transparent materials it resolves to the palette `labelFill`; on wireframe material, text and line paint are driven by the wire gradients.

### `SquircleLayerGeometryConfig`

Layer geometry overrides affect one squircle only. Use these fields when a composition needs mixed corner radius, prism height, or line-inlay proportion while keeping the shared scene projection.

| Field | Type | Inherits From | Meaning |
| --- | --- | --- | --- |
| `exponent` | `number` | `geometry.exponent` | Superellipse exponent for this layer. Lower is rounder, higher is squarer. |
| `prismHeight` | `number` | `geometry.prismHeight` | Extrusion height for this layer in SVG units. |
| `inlayScale` | `number` | `geometry.inlayScale` | Line-inlay size relative to this layer's outer squircle. |

### `SquircleGeometryConfig`

Scene geometry supplies defaults for layers plus shared camera/projection/viewBox behavior. Prefer `layer.geometry` for per-layer radius, height, and line size.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `width` | `number` | `800` | SVG viewBox width and geometry fitting target. |
| `viewBoxHeight` | `number` | `480` | Base SVG viewBox height before optional layer fitting. |
| `exponent` | `number` | `12` | Superellipse exponent. Lower is rounder, higher is squarer. |
| `samples` | `number` | `160` | Number of sampled superellipse points. |
| `halfSize` | `number` | computed from `width` | Raw superellipse half-size before projection. |
| `prismHeight` | `number` | `10` | Extrusion height in SVG units. |
| `angleDegrees` | `number` | `20` | Scene camera elevation angle. Lower values are more side-on; higher values show more of the top face. |
| `inlayScale` | `number` | `0.6` | Line-inlay scale relative to the outer squircle. |
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
| `line` | `2.2` | Line-inlay width for solid/transparent material. |
| `wireLine` | `1.6` | Line-inlay width for wireframe material. |
| `labelWire` | `1.1` | Outlined text stroke width. |

### `SquircleOpacityConfig`

| Field | Default | Meaning |
| --- | --- | --- |
| `transparentFace` | `0.38` | Face opacity for `material: "transparent"`. |
| `transparentAnnotation` | `0.62` | Text/line opacity on transparent material. |
| `solidAnnotation` | `0.88` | Text/line opacity on solid or wireframe material. |

### Palettes

`paletteId` accepts any id from `SQUIRCLE_PALETTE_IDS`: `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`. The palette object fields are:

| Field | Meaning |
| --- | --- |
| `id` | Stable palette id. |
| `label` | Human-readable palette name. |
| `top` | Top-face gradient stops. |
| `side` | Side-wall gradient stops. |
| `textWire` | Gradient stops used for outlined text. |
| `labelFill` | Automatic filled text/line color. |
| `topEdge` | Top-face hairline stroke color. |
| `sideEdge` | Side-wall hairline stroke color. |
| `swatch` | Two-color UI swatch. |

`effect: "off"` uses the normal static top gradient. `metal` clips animated blurred color fields to the top face, with the color field authored in local squircle-plane coordinates and projected through the same isometric matrix as text. Effect colors are derived from the selected alpha palette.

## Surface Effects

Solid and transparent squircles can opt into an animated top-surface effect with `effect: "metal"`. The effect keeps the prism geometry fixed: only the top face paint changes. Transparent effects keep the material's `transparentFace` opacity on the animated color field.

The color field is built in the flat squircle plane, blurred in that local coordinate system, and then projected onto the top face. The generated top polygon remains the screen-space clip path. This keeps the gradients reading as surface paint instead of flat circles floating above the prism.

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
| `events.html` | Vite shell for the focused sibling-hover example |
| `constructor.html` | Vite shell for the React constructor UI |
| `react.html` | Compatibility Vite shell for the constructor UI |
| `legacy-static/` | Ignored local archive of the former static HTML/CSS snapshots |
| `docs/` | Agent-facing component, design, example-page, and verification docs |

## Current Visual Defaults

- Superellipse: `n = 12`, `N = 160`, `a = 225.49`
- Prism height: `h = 10`
- Projection: `20deg`
- Line inlay scale: `60%`
- ViewBox: `0 0 800 480`
- Default palette: `15 Alpha`
- Default three-layer offsets: bottom `y = 176`, middle `y = 88`, top `y = 0`

## Hard Rules

- New reusable work should go through `src/squircle`.
- Component styles belong beside their components in `src/squircle`; example-page styles live under `src/pages`.
- Do not hand-edit generated prism, inlay, or hidden-edge coordinates; regenerate from [Geometry Contract](docs/design/geometry.md).
- Keep hover swaps opacity-only: no transform, scale, filter, halo, or layer-gap changes.
- Use function-valued `layer.hover` for sibling-hover interactions. Use layer events only when the host app needs external state outside the SVG.
- Render top-plane text as one SVG text element on the projected top plane. Do not duplicate it for filled and wireframe states.
- Keep variant colors synchronized with [Color System](docs/design/colors.md).
- Keep animated top effects clipped to the generated full-resolution top polygon; annotations still draw above the effect.
- Keep metal color fields in local top-plane coordinates before projection; do not place their blobs directly in screen space.
- Keep the body background transparent.
