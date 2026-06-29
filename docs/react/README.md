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
      hover: { material: "solid", paletteId: "20", effect: "metal", grain: true },
      stroke: { wire: 1.6, face: 0.35, labelWire: 1.1 }
    }
  ]}
  onLayerClick={({ layerId }) => setSelectedId(layerId)}
/>
```

`layers` can contain 0-N items. The array order is draw order: first item is lowest/backmost, last item is topmost/frontmost. A layer with `visible: false` renders non-interactively at opacity `0`, so visibility changes can fade; remove a layer from the array to drop it structurally.

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

Use a function when the currently hovered layer should affect other layers. The resolver runs for each rendered layer:

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

Return a hover state to crossfade that layer. The returned object is shallow-merged over that layer's `base`, so include only fields you want to change. For example, `{ material: "wireframe" }` enforces wireframe while preserving the layer's palette, text, line, geometry, and stroke settings. Hover state may also include `visible: false` or `visible: true`; visibility fades with `transitionMs` and can be combined with material/color changes. Return `false`, `null`, or `undefined` to leave that layer unchanged.

The resolver receives:

| Field | Meaning |
| --- | --- |
| `layer` | The layer currently being resolved |
| `index` | Rendered draw-order index for `layer` |
| `layers` | Rendered layers |
| `hoveredLayerId` | The layer currently under the pointer |
| `hoveredLayer` | The hovered layer config |
| `hoveredIndex` | Rendered draw-order index for `hoveredLayer` |

## Layer Click

Use `onLayerClick` when the host app needs selection, analytics, or UI outside the SVG.

The callback receives `{ layerId, layer, index, layerElement, event }`. `index` is the mounted draw-order index from the `layers` array, and `layerElement` is the matched SVG `<g>` for that layer. Hover behavior belongs in `layer.hover`.

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
| `fitToLayers` | `boolean` | `true` | Expands the viewBox height to include every mounted layer offset, including layers hidden at opacity `0`. |
| `transitionMs` | `number` | `220` | Hover and programmatic visual-state crossfade duration in milliseconds. |
| `transitionConfigChanges` | `boolean` | `true` | Crossfade programmatic layer visual-state changes by briefly keeping outgoing snapshots mounted. |
| `onLayerClick` | `(event: SquircleLayerClickEvent) => void` | none | Called on layer click with `{ layerId, layer, index, layerElement, event }`. |

### `SquircleLayerConfig`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | required | Stable layer id. |
| `visible` | `boolean` | `true` | Hidden layers render non-interactively at opacity `0` so visibility changes can fade. Remove a layer from the array to drop it structurally. |
| `offset` | `{ x?: number; y?: number }` | `{ x: 0, y: 0 }` | SVG translation for this layer. |
| `geometry` | `SquircleLayerGeometryConfig` | scene geometry | Per-layer radius, prism height, and line-inlay scale. |
| `base` | `SquircleVariantConfig` | required | Normal layer state. |
| `hover` | `SquircleLayerHoverState \| SquircleLayerHoverResolver` | none | Hover state. Use an object for this layer's own hover; use a function to calculate hover state for each layer based on the currently hovered layer. Hover objects and resolver returns are shallow-merged over `base`, so omitted fields stay unchanged. Add `visible` to fade a layer in or out during hover. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Layer-wide stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Layer-wide opacity overrides. |
| `className` | `string` | none | Extra class on the layer group. |

### `SquircleVariantConfig`

Each layer has a required `base` variant plus an optional `hover` state. `hover` can be an object shallow-merged over `base`, or a resolver function that returns a state to shallow-merge over the resolved layer's `base`.

| Field | Values | Default | Meaning |
| --- | --- | --- | --- |
| `material` | `solid`, `glass`, `wireframe` | `wireframe` | Prism rendering mode. `transparent` is accepted as a deprecated alias for `glass`. |
| `paletteId` | `13` through `21` | `15` | Palette from `SQUIRCLE_PALETTES`. |
| `effect` | `off`, `metal`, `mesh` | `off` | Top-face surface effect for solid and glass materials. Ignored by wireframe material. |
| `grain` | `boolean` | `false` | Adds subtle multiply-blended surface grain clipped to the top face for solid and glass materials. Ignored by wireframe material. |
| `text` | `string`, `false` | none | Render top-plane text. Pass a string such as `"GPU"` or `"{}"`; pass `false` in a hover variant to hide inherited text. |
| `line` | `solid`, `dotted`, `dashed`, `false` | `false` | Render a top-plane inner line. |
| `textStyle` | `solid`, `wireframe` | `solid` | Filled or outlined text. |
| `textColor` | `auto`, `white`, `black` | `auto` | Text paint for solid/glass material. `auto` uses palette annotation color on solid and contrast paint on glass. |
| `textSize` | `number` | `62` | Text font size. |
| `textFontFamily` | `string` | `Arial, Helvetica, sans-serif` | SVG text font family. |
| `textFontWeight` | `string`, `number` | `400` | SVG text font weight. |
| `lineColor` | `auto`, `white`, `black` | `auto` | Line paint for solid/glass material. `auto` uses palette annotation color on solid and contrast paint on glass. |
| `stroke` | `Partial<SquircleStrokeConfig>` | default strokes | Per-variant stroke overrides. |
| `opacity` | `Partial<SquircleOpacityConfig>` | default opacity | Per-variant opacity overrides. |

`SquircleLayerHoverState` supports every `SquircleVariantConfig` field plus `visible?: boolean`. Use `visible` only in `hover`, not in `base`, when a hover interaction should fade a layer in or out.

Hover transitions always crossfade with `transitionMs`, including changes to material, palette, effect, grain, text, and line. If hover only changes text or line on the same surface, the renderer keeps the underlying surface stable and crossfades only the annotations.

`auto` is material-aware annotation paint. On solid material it resolves to the palette `labelFill`; on glass material it chooses black or white by contrast against the translucent top face over the current theme stage; on wireframe material, text and line paint are driven by the wire gradients.

Programmatic config transitions use the same opacity-crossfade model as hover for simple visual changes: the renderer keeps a bounded number of outgoing visual snapshots mounted for `transitionMs`, while the new state fades in. This is intended for text, line, palette, material, annotation style, and visibility changes on non-effect surfaces. Same-surface text/line changes and visibility-only changes also fade on `metal`, `mesh`, and `grain` layers because no duplicate effect surface is needed. Actual surface-recipe swaps involving `metal`, `mesh`, or `grain` update instantly to avoid duplicate animated/filter layers and visual blinking. Geometry, camera, offset, theme, and layer-order changes are not morphed; they update structurally.

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
| `line` | `2.2` | Line-inlay width for solid/glass material. |
| `wireLine` | `1.6` | Line-inlay width for wireframe material. |
| `labelWire` | `1.1` | Outlined text stroke width. |

### `SquircleOpacityConfig`

| Field | Default | Meaning |
| --- | --- | --- |
| `transparentFace` | `0.26` | Face opacity for `material: "glass"`; historical name retained for compatibility. |
| `transparentAnnotation` | `0.88` | Text/line opacity on glass material; historical name retained for compatibility. |
| `solidAnnotation` | `0.88` | Text/line opacity on solid or wireframe material. |

### Palettes

`paletteId` accepts any id from `SQUIRCLE_PALETTE_IDS`: `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`. The palette object fields are:

| Field | Meaning |
| --- | --- |
| `id` | Stable palette id. |
| `label` | Human-readable palette name. |
| `top` | Top-face gradient stops. |
| `side` | Side-wall gradient stops. |
| `wire` | Optional wireframe prism/line gradient stops. Defaults to `top` when omitted. |
| `textWire` | Gradient stops used for outlined text. |
| `labelFill` | Automatic filled text/line color. |
| `topEdge` | Top-face hairline stroke color. |
| `sideEdge` | Side-wall hairline stroke color. |
| `swatch` | Two-color UI swatch. |
| `dark` | Optional dark-theme overrides for top, side, wire, textWire, labelFill, edges, and swatch. |

`effect: "off"` uses the normal static top gradient. `metal` clips animated color fields to the top face. Chrome/Firefox keep the original SVG-blur metal backend; Safari/iOS use a no-filter soft-blob backend for performance. `mesh` renders an animated four-corner bilinear gradient whose corner colors slowly trade places. Both animated effects are authored in the flat squircle plane and projected with the same isometric matrix as text. Effect colors are derived from the selected palette. On `material: "glass"`, the animated color field keeps `transparentFace` opacity. `grain: true` can be combined with any filled effect and renders as a clipped multiply-blended sibling overlay.

`material: "glass"` renders as a glass-like prism: lower-alpha top/side faces, palette wire-gradient rims, and the generated hidden/back guide visible through the faces. It is not just a lightened solid palette. `material: "transparent"` is still accepted and normalized to `glass` for older configs.

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
- `wire`: optional wireframe prism/line gradient stops, falling back to `top`
- `textWire`: text-local wireframe gradient stops
- `labelFill`: automatic annotation color
- `topEdge` and `sideEdge`: hairline edge strokes
- `swatch`: UI preview colors
- `dark`: optional dark-theme overrides for palette fields

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
- solid and glass palettes can switch between `off`, `metal`, and `mesh` without moving geometry or annotations.
- `grain: true` stays clipped to the selected top face and does not grain the scene background.
- `metal` reads as a smooth projected surface field, not as visible screen-space circles. Chrome/Firefox should use `sq-top-effect-metal-blur`; Safari/iOS should use `sq-top-effect-metal-soft`.
- `mesh` reads as a smooth four-corner surface blend, not as blobs, waves, or a hotspot.
