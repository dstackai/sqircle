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
      hover: { material: "solid", paletteId: "20", effect: "metal" },
      stroke: { wire: 1.6, face: 0.35, labelWire: 1.1 }
    }
  ]}
  onLayerClick={({ layerId }) => setSelectedId(layerId)}
/>
```

`layers` can contain 0-N items. The array order is draw order: first item is lowest/backmost, last item is topmost/frontmost. A layer with `visible: false` is skipped without changing the other layer offsets.

## Hover

`hover` has two forms.

Use an object when only that layer changes on hover:

```tsx
{
  id: "top",
  base: { material: "solid", paletteId: "15" },
  hover: { material: "wireframe", paletteId: "20" }
}
```

Use a function when the currently hovered layer should affect other layers. The resolver runs for each visible layer:

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

Return a variant to crossfade that layer. The returned object is shallow-merged over that layer's `base`, so include only fields you want to change. For example, `{ material: "wireframe" }` enforces wireframe while preserving the layer's palette, text, line, geometry, and stroke settings. Return `false`, `null`, or `undefined` to leave that layer unchanged.

The resolver receives:

| Field | Meaning |
| --- | --- |
| `layer` | The layer currently being resolved |
| `index` | Visible draw-order index for `layer` |
| `layers` | Visible layers |
| `hoveredLayerId` | The layer currently under the pointer |
| `hoveredLayer` | The hovered layer config |
| `hoveredIndex` | Visible draw-order index for `hoveredLayer` |

## Layer Click

Use `onLayerClick` when the host app needs selection, analytics, or UI outside the SVG.

The callback receives `{ layerId, layer, index, layerElement, event }`. `index` is the visible draw-order index after hidden layers are filtered, and `layerElement` is the matched SVG `<g>` for that layer. Hover behavior belongs in `layer.hover`.

## Editor Component

The optional constructor UI is documented separately in [Editor Guide](./editor.md). Keep this guide focused on the main renderer and reusable scene data model.

## Complete Options Reference

This section is the renderer source of truth for public options. Keep it synchronized with `src/squircle/types.ts`.

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

`effect: "off"` uses the normal static top gradient. `metal` clips animated blurred color fields to the top face, but the fields are authored in the flat squircle plane and projected with the same isometric matrix as text. Effect colors are derived from the selected alpha palette. On `material: "transparent"`, the animated color field keeps `transparentFace` opacity.

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
  line: 2.2,
  wireLine: 1.6,
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

Use `createSquircleLayers(count)` for quick default layers and `reflowLayerOffsets(layers, gap)` when adding, removing, or reordering layers in a host UI. These helpers preserve the convention that the top layer has `offset.y = 0` and lower layers move downward by `gap`.

## Verification

Run:

```sh
npm run typecheck
npm run build
```

Then open `/index.html`, `/demo.html`, and `/events.html` from the Vite dev server and verify:

- empty layer arrays render an empty SVG without crashing.
- adding layers keeps array order as draw order.
- no-op hover layers do not blink.
- Function-valued `layer.hover` can crossfade sibling layers without page-level layer rewriting.
- hover behavior is configured through `layer.hover`, including sibling layer changes.
- `/events.html` demonstrates the minimal function-hover sibling pattern.
- wireframe text outline uses the text-local gradient, not a single-stroke replacement.
- solid and transparent palettes can switch between `off` and `metal` without moving geometry or annotations.
- `metal` reads as a smooth projected surface field, not as visible screen-space circles.
