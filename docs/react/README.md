# React Component Guide

The maintainable renderer implementation lives in `src/squircle`. The root HTML files mount React examples from `src/pages`; reusable scene work should prefer `SquircleScene` rather than static SVG markup.

## Files

- `src/squircle/SquircleScene.tsx`: renders the SVG scene.
- `src/squircle/geometry.ts`: generates superellipse prism, hidden edge, inlay, label transform, and gradient bounds from constants.
- `src/squircle/palettes.ts`: exports palette constants.
- `src/squircle/types.ts`: public config and prop types.
- `src/pages`: repo-local examples that consume `SquircleScene`.
- Top-plane text is rendered by `SquircleScene` as live SVG text projected with the same isometric matrix as the top face. The demos use `GPU` as example text, but component configs can pass any string.
- `src/squircle/SquircleEditor.tsx` and `src/squircle/codeExport.ts`: optional constructor UI and code exporter, documented separately in [editor.md](./editor.md).

## Renderer Component

```tsx
<SquircleScene
  theme="dark"
  layers={[
    {
      id: "bottom",
      offset: { y: 176 },
      base: { material: "wireframe", paletteId: "15" },
      hover: { material: "solid", paletteId: "20", effect: "fluid" },
      stroke: { wire: 1.6, face: 0.35, labelWire: 1.1 }
    }
  ]}
  onLayerSelect={(id) => setSelectedId(id)}
/>
```

`layers` can contain 0-N items. The array order is draw order: first item is lowest/backmost, last item is topmost/frontmost. A layer with `visible: false` is skipped without changing the other layer offsets.

## Editor Component

The optional constructor UI is documented separately in [Editor Guide](./editor.md). Keep this guide focused on the main renderer and reusable scene data model.

## Complete Options Reference

This section is the renderer source of truth for public options. Keep it synchronized with `src/squircle/types.ts`.

### `SquircleScene`

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `layers` | `SquircleLayerConfig[]` | required | Draw-order layer array. First item is lowest/backmost; last item is topmost/frontmost. |
| `geometry` | `SquircleGeometryConfig` | `DEFAULT_GEOMETRY` | Scene geometry, projection, prism height, and dashed inlay scale. |
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
| `base` | `SquircleVariantConfig` | required | Normal layer state. |
| `hover` | `SquircleVariantConfig` | none | Hover state merged over `base`. If absent or identical, no hover copy is rendered. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Layer-wide stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Layer-wide opacity overrides. |
| `className` | `string` | none | Extra class on the layer group. |

### `SquircleVariantConfig`

Each layer has a required `base` variant and an optional `hover` variant. Hover is still a state swap: the component renders a `.sq-hover` group only when the resolved hover variant differs from base. If hover is absent or identical, the layer has no `.sq-has-hover`, no hover copy, and no crossfade blink.

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

### `SquircleGeometryConfig`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `width` | `number` | `800` | SVG viewBox width and geometry fitting target. |
| `viewBoxHeight` | `number` | `480` | Base SVG viewBox height before optional layer fitting. |
| `exponent` | `number` | `12` | Superellipse exponent. Lower is rounder, higher is squarer. |
| `samples` | `number` | `160` | Number of sampled superellipse points. |
| `halfSize` | `number` | computed from `width` | Raw superellipse half-size before projection. |
| `prismHeight` | `number` | `10` | Extrusion height in SVG units. |
| `angleDegrees` | `number` | `20` | Isometric projection elevation angle. |
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

`effect: "off"` uses the normal static top gradient. `fluid` and `frosted` clip animated blurred color fields to the top face, but the fields are authored in the flat squircle plane and projected with the same isometric matrix as text. `frosted` adds a screen-space pale veil and brighter rim. Effect colors are derived from the selected alpha palette.

## Stroke Parameters

Stroke widths and opacities are explicit data, not hard-coded CSS side effects:

```ts
{
  face: 0.35,
  faceOpacity: 0.72,
  wire: 1.6,
  wireOpacity: 0.88,
  hidden: 1.2,
  hiddenOpacity: 0.28,
  dash: 2.2,
  wireDash: 1.6,
  labelWire: 1.1
}
```

Set `layer.stroke` for layer-wide defaults. Set `base.stroke` or `hover.stroke` only when a particular state needs to override that layer. Geometry does not move when strokes change.

## Palettes

`SQUIRCLE_PALETTES` is the source of truth for React:

- `top`: top-face gradient stops
- `side`: side-wall gradient stops
- `textWire`: text-local wireframe gradient stops
- `labelFill`: automatic annotation color
- `topEdge` and `sideEdge`: hairline edge strokes
- `swatch`: UI preview colors

Do not invent colors inside a layer config. Add new palettes to `palettes.ts` and update [colors.md](../design/colors.md). Effect colors are derived from palette stops except for neutral white highlight/rim overlays documented in [rendering.md](../design/rendering.md).

## Geometry

`createSquircleGeometry()` implements the math from [geometry.md](../design/geometry.md):

- superellipse exponent `n = 12`
- samples `N = 160`
- projection angle `20deg`
- prism height `10`
- inlay scale `0.6`

The component generates polygons at render time. Do not paste generated point lists into React source.

## 0-N Layer Helpers

Use `createSquircleLayers(count)` for quick default layers and `reflowLayerOffsets(layers, gap)` when adding/removing layers in a host UI. These helpers preserve the convention that the top layer has `offset.y = 0` and lower layers move downward by `gap`.

## Verification

Run:

```sh
npm run typecheck
npm run build
```

Then open `/index.html` and `/demo.html` from the Vite dev server and verify:

- empty layer arrays render an empty SVG without crashing.
- adding layers keeps array order as draw order.
- no-op hover layers do not blink.
- wireframe text outline uses the text-local gradient, not a single-stroke replacement.
- solid palettes can switch between `off`, `fluid`, and `frosted` without moving geometry or annotations.
- `fluid` and `frosted` read as smooth projected surface fields, not as visible screen-space circles.
