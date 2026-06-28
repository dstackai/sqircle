# Rendering Contract

This file documents gradients, edge sharpness, top-plane annotations, and the text-label technique. The current demo text spells `GPU`, but reusable React config calls the feature `text`.

For exact variant stops and CSS color variables, see [colors.md](./colors.md).

## Gradient Bboxes

All face gradients use `gradientUnits="userSpaceOnUse"` and coordinates derived from generated points:

- Top gradient bbox: `x1 = 0`, `y1 = 0`, `x2 = 800`, `y2 = 291.18`
- Text surface gradient: `x1 = -425.63`, `y1 = -0.1`, `x2 = 425.6`, `y2 = 0.07`, with the same stops as the matching top gradient
- Side gradient bbox: `x1 = 0`, `y1 = 0`, `x2 = 800`, `y2 = 301.18`, computed from top face plus side wall

Top gradients span only the top face. Side gradients span the full top-plus-wall silhouette so the shadow ramp continues in the same projected coordinate space instead of restarting on the wall.

React uses `text-surface-*` gradients to remap the top face stops into the label's local projected plane. These gradients are used for `textStyle: "solid"` on wireframe material, where filled text should read as top-surface paint rather than wire stroke color.

Wireframe mode uses the top gradient as the stroke gradient so upper and lower curves match. This intentionally avoids fake lighting on wireframes.

## Filled Surface Effects

`SquircleVariantConfig.effect` changes only the top-face rendering for filled materials: `material: "solid"` and `material: "transparent"`. It is ignored by `wireframe`.

| Effect | Rendering |
| --- | --- |
| `off` | A static top polygon filled by the resolved top gradient. This is the default. |
| `metal` | A full-resolution top-face `clipPath` containing an isometrically projected base color field plus moving soft color blobs. Chrome/Firefox use the original SVG Gaussian-blur backend; Safari/iOS use a radial-gradient blob backend to avoid per-frame SVG filter rasterization. No displacement map is used. |
| `mesh` | A full-resolution top-face `clipPath` containing a projected four-corner bilinear gradient. The four corner colors are sampled from `palette.top` and slowly exchange along diagonal pairs. No blobs, hotspots, noise, turbulence, or internal wave figures are used. |

The moving effects are driven by a shared, throttled `requestAnimationFrame` clock inside `SquircleScene`. The clock mutates SVG attributes through refs instead of setting React state per frame, pauses when `document.hidden`, and scenes unsubscribe while offscreen through `IntersectionObserver`. Motion is enabled only when a visible base or hover variant resolves to a solid/transparent `metal` or `mesh` state.

Effect color layers are authored in the flat top-face local coordinate system, not in screen coordinates. Local `(0, 0)` is the center of the raw superellipse, and local `a` is `geometry.config.halfSize`. The whole color field is then wrapped in the same isometric matrix used by labels:

```text
matrix(cosA, sinA, -cosA, sinA, cx, cy - h)
```

For `metal`, circles are intentionally authored as local circles, then become foreshortened ellipses on the tilted top plane. The top clip path stays in screen space around the generated `topPoints` polygon.

Metal backend rules:

- Non-Safari browsers use `sq-top-effect-metal-blur`: hard color circles inside the original SVG `feGaussianBlur` filters, preserving the original Chrome/Firefox look.
- Safari and iOS use `sq-top-effect-metal-soft`: larger radial-gradient circles, no SVG filter, and no `mix-blend-mode`. This keeps the moving metal field while avoiding Safari's expensive animated SVG blur path.
- Backend selection is internal; public config remains `effect: "metal"`.

For `mesh`, the top row is a local horizontal gradient from top-left to top-right, the bottom row is a local horizontal gradient from bottom-left to bottom-right, and a local vertical mask crossfades the top row over the bottom row. The result is a true bilinear blend across the projected plane. Corner home levels are sampled from `palette.top` at `0`, `0.33`, `0.66`, and `1`; diagonal pairs exchange over staggered timers, so the palette is conserved while the corner assignment changes.

The SVG structure for effect faces must keep this order:

```svg
<g clip-path="url(#top-clip)">
  <g transform="matrix(cosA,sinA,-cosA,sinA,cx,cy-h)">
    <rect ... />
    <g filter="url(#local-blur)">
      <circle ... />
    </g>
  </g>
</g>
<!-- outline stays here in screen space -->
```

Effect scale is always derived from `W = 2 * a`, the local top-plane width, not from screen pixels or the projected bbox:

- Main blob radius is about `0.45 * W`.
- Blur is about `0.13 * W`, keeping `blur / radius` near `0.27`.
- Drift amplitude is about `0.20..0.25 * W`.
- Blob centers are allowed to sit outside `+-a` so every frame heavily overlaps and overfills the clipped face.
- The base rectangle covers `+-1.3a`, so the face never shows gaps between blobs.

The blur filters used by the non-Safari metal backend use `filterUnits="userSpaceOnUse"` and `primitiveUnits="userSpaceOnUse"` with a local filter region centered around `(0, 0)`. If `halfSize` changes, blob radii, blur, positions, base rect, and motion amplitudes must all scale from `a` or `W` together. Scaling only some of them makes the blobs collapse into visible circles.

Effect invariants:

- The clip path uses the same generated `topPoints` polygon as the normal top face.
- Metal color blobs must never be placed directly in screen coordinates.
- Metal must not use `feDisplacementMap`; it turns the smooth surface field into raster clouds.
- Safari/iOS metal must not use animated SVG blur filters or blend modes.
- Mesh must stay a four-corner bilinear blend. Do not add radial gradients, spotlights, noise, turbulence, or wave structure.
- Mesh corner colors must be sampled from `palette.top`, and the four sampled levels must remain conserved during animation.
- Mesh animation should update existing gradient stop colors through refs, not trigger React scene re-renders per frame.
- Transparent material applies `transparentFace` opacity to the animated color field so effects do not make the top face fully opaque.
- Annotations render after the effect, so text and line stay readable and stay glued to the top plane.
- Side wall geometry, layer offsets, hover transitions, and annotation transforms do not change when the effect changes.
- Effect colors are derived from the selected alpha palette's top and side stops.

## Surface Grain

`SquircleVariantConfig.grain` is independent of `effect`. It is honored only by `material: "solid"` and `material: "transparent"` and can sit over `off`, `metal`, or `mesh`.

The grain is not drawn inside the prism geometry. `SquircleScene` creates a sibling `<svg class="sq-grain-overlay">` above the main scene, computes one overlay rectangle per grained top face, and clips each rectangle to the generated `topPoints` polygon converted into `objectBoundingBox` coordinates. This keeps grain off the page background and off the side wall.

Because the sibling overlay sits above the main SVG, each lower grain rectangle must also be masked by filled silhouettes of layers drawn above it. The occlusion mask is generated from later layers' `wallPoints` and `topPoints`, offset into the scene, normalized into the lower grain rectangle's object-bounding-box space, and polygon-clipped to `0..1`. This preserves the resolution-locked grain overlay while making grain respect the same layer draw order as the prism geometry.

The current grain recipe is `mult-hard @ 0.5px`:

```ts
const GRAIN_OPACITY = 0.46;
const GRAIN_BASE_FREQUENCY = 2.4;
const GRAIN_OCTAVES = 3;
const GRAIN_CONTRAST_SLOPE = 2.2;
const GRAIN_CONTRAST_INTERCEPT = -0.22;
```

The overlay filter uses:

```svg
<feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="3" seed="14" result="n" />
<feColorMatrix in="n" type="saturate" values="0" />
<feComponentTransfer>
  <feFuncR type="linear" slope="2.2" intercept="-0.22" />
  <feFuncG type="linear" slope="2.2" intercept="-0.22" />
  <feFuncB type="linear" slope="2.2" intercept="-0.22" />
  <feFuncA type="linear" slope="0" intercept="1" />
</feComponentTransfer>
```

CSS applies `mix-blend-mode: multiply` to `.sq-grain-overlay`. The `-0.22` intercept recenters the grayscale transfer for multiply, so the overlay reads as subtle dark grit instead of bright sparkle. Transparent material multiplies the grain opacity by `transparentFace` so the texture follows the material opacity.

Grain invariants:

- The overlay must be `pointer-events: none`.
- When grain is available, the scene root wraps an internal frame; the frame, not external layout padding, owns the main SVG and grain overlay alignment.
- Each overlay clip must come from generated top points plus the layer offset, not from hand-written coordinates.
- Lower-layer grain must be masked against later filled layers so it never appears on top of a higher solid or transparent prism.
- Grain hover changes should crossfade opacity with the same `--sq-transition-ms` as base/hover variants.
- Do not use grain to add texture to wireframe material.

## Sharpness Edge

Every filled face has a tiny in-family edge stroke:

- `--top-edge` on the top face
- `--side-edge` on the side wall
- `--face-edge-width: 0.35`
- `--face-edge-opacity: 0.72`

These edge colors are set per variant and must stay in the same color family. Never use black for prism edges; it flattens the gradients.

## Draw Order

Each prism definition follows this order:

1. Side wall polygon
2. Top face polygon

The top face is drawn after the side wall, so it hides the back half of the extrusion without masks or z-buffering.

## Line Inlay

The middle-layer line squircle is generated from the same superellipse at `0.6 * a` and projected at `z = h`, so it lies on the top plane.

`SquircleScene` renders the line inlay as the same top-plane polygon in every material. `line` controls only the stroke pattern:

- `line: "solid"`: continuous stroke.
- `line: "dotted"`: rounded dotted stroke.
- `line: "dashed"`: rounded dashed stroke.
- `line: false`: no inlay.

By default, solid and transparent inlays use the palette label color, the same automatic annotation paint as filled text. Wireframe inlays use the top-face gradient, matching the prism wires.

`lineColor: "auto"` keeps the material default. `lineColor: "white"` and `lineColor: "black"` intentionally use fixed stroke colors on solid/transparent material. Wireframe material ignores fixed line color and uses the wire gradient.

## Label Source

React renders top-plane text as one live SVG `<text>` element, so component configs can pass arbitrary strings such as `text: "GPU"`, `text: "CUDA"`, or `text: "AI"`. `GPU` is only the example string used by the local demos.

Current label parameters:

- Label outline source: `/System/Library/Fonts/Supplemental/Arial.ttf`
- Label outline size: `62px`
- Source bbox before centering: `x = 3.2998..129.3584`, `y = -45.1377..0.7568`
- Centering translation before projection: `x = -66.3291`, `y = 22.1904`
- Centered bbox: `x = -63.0293..63.0293`, `y = -22.9473..22.9473`
- Label wire stroke: `1.1`

The old static snapshots used an outlined glyph path generated with `opentype.js@2.0.0`. Do not use that path technique in new component work; keep live text so arbitrary strings render correctly.

```js
const font = opentype.parse(fs.readFileSync("/System/Library/Fonts/Supplemental/Arial.ttf").buffer);
const path = font.getPath("GPU", 0, 0, 62, { kerning: true });
const box = path.getBoundingBox();
const tx = -((box.x1 + box.x2) / 2);
const ty = -((box.y1 + box.y2) / 2);
```

If a legacy snapshot ever needs refreshing, apply `tx` and `ty` to every path command coordinate before writing the static `d` attribute, and keep `fill-rule="evenodd"` plus `clip-rule="evenodd"` so counters remain true holes.

## Label Transform And Paint

Every React label is a single `<text>` element transformed onto the top plane with:

```text
matrix(cosA, sinA, -cosA, sinA, cx, cy - h)
```

For the current geometry:

```text
matrix(0.94, 0.342, -0.94, 0.342, 400, 145.6)
```

The transform never changes between solid and wireframe modes; only paint changes. React and constructor defaults intentionally mirror the original generated GPU path: `textSize: 62`, `textFontFamily: "Arial, Helvetica, sans-serif"`, and `textFontWeight: 400`.

Solid text style:

- The label uses palette label paint when `textColor` is `auto`.
- Solid/transparent line uses the same palette label paint by default.
- `15 Alpha` uses `#f7fbff` because its top gradient is dark.
- Lighter variants use dark in-family label fills.

Wireframe text style:

- `textStyle: "wireframe"` uses the same live text element as filled mode.
- It sets `fill: none` and uses a stroke.
- On solid/transparent material, outline paint comes from `textColor`; `auto` resolves to the palette label paint, matching filled text and solid line.
- On wireframe material, outline paint resolves to the label-local `textWire` gradient.
- Wireframe line uses the top-face gradient so inlays match prism wires.
- It must remain an outline around the font figures, not a single-stroke lettering replacement.
- Keep the outline stroke thin relative to text size. The default `labelWire` is `1.1` at `textSize: 62`, safely below the ratio where counters start merging.

Do not sample the full-face top ramp directly for the text outline on wireframe material; it is too large for the label geometry and makes the color read wrong. Use one text element for all text styles. Use `textColor` for solid/transparent outline paint and the label-local wire gradient for wireframe-material outline paint.

Do not introduce `textStyle: "transparent"` as a third paint control. On wireframe material, `textStyle: "solid"` renders a fully opaque filled label using the text surface gradient, and `textStyle: "wireframe"` renders an outlined label using the text wire gradient.

Do not build filled letters from `<rect>`, `<line>`, or separate stem/bowl paths. Do not add a second label copy and do not replace the text with monoline lettering for outline mode.
