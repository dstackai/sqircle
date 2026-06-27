# Rendering Contract

This file documents gradients, edge sharpness, top-plane annotations, and the text-label technique. The current demo text spells `GPU`, but reusable React config calls the feature `text`.

For exact variant stops and CSS color variables, see [colors.md](./colors.md).

## Gradient Bboxes

All face gradients use `gradientUnits="userSpaceOnUse"` and coordinates derived from generated points:

- Top gradient bbox: `x1 = 0`, `y1 = 0`, `x2 = 800`, `y2 = 291.18`
- Text surface gradient: `x1 = -425.63`, `y1 = -0.1`, `x2 = 425.6`, `y2 = 0.07`, with the same stops as the matching top gradient
- Side gradient bbox: `x1 = 0`, `y1 = 0`, `x2 = 800`, `y2 = 301.18`, computed from top face plus side wall

Top gradients span only the top face. Side gradients span the full top-plus-wall silhouette so the shadow ramp continues in the same projected coordinate space instead of restarting on the wall.

React uses `text-surface-*` gradients to remap the top face stops into the label's local projected plane. Static fixtures still use `gpu-surface-*` ids because those pages render the GPU example glyph. These gradients are used for `textStyle: "solid"` on wireframe material, where filled text should read as top-surface paint rather than wire stroke color.

Wireframe mode uses the top gradient as the stroke gradient so upper and lower curves match. This intentionally avoids fake lighting on wireframes.

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

## Inlay

The middle-layer dashed squircle is generated from the same superellipse at `0.6 * a` and projected at `z = h`, so it lies on the top plane. The static copies are:

`SquircleScene` renders the dashed inlay as the same top-plane polygon in every material. Paint changes by material:

By default, solid and transparent inlays use the palette label color, the same contrast token as filled text. Wireframe inlays use the top-face gradient, matching the prism wires.

`dashColor: "contrast"` keeps the material default. `dashColor: "white"` and `dashColor: "black"` intentionally use fixed stroke colors on solid/transparent material. Wireframe material ignores fixed dash color and uses the wire gradient.

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

- The label uses palette label paint when `textColor` is `contrast`.
- Solid/transparent dash uses the same palette label paint by default.
- `15 Alpha` uses `#f7fbff` because its top gradient is dark.
- Lighter variants use dark in-family label fills.

Wireframe text style:

- `textStyle: "wireframe"` uses the same live text element as filled mode.
- It sets `fill: none` and uses a stroke.
- On solid/transparent material, outline paint comes from `textColor`; `contrast` resolves to the palette label paint, matching filled text and solid dash.
- On wireframe material, outline paint resolves to the label-local `textWire` gradient.
- Wireframe dash uses the top-face gradient so dashed inlays match prism wires.
- It must remain an outline around the font figures, not a single-stroke lettering replacement.
- Keep the outline stroke thin relative to text size. The default `labelWire` is `1.1` at `textSize: 62`, safely below the ratio where counters start merging.

Do not sample the full-face top ramp directly for the text outline on wireframe material; it is too large for the label geometry and makes the color read wrong. Use one text element for all text styles. Use `textColor` for solid/transparent outline paint and the label-local wire gradient for wireframe-material outline paint.

Deprecated `gpuColor` aliases are accepted only for old snippets and map to React `textColor`. They override label paint only on solid/transparent material. On wireframe material, `textStyle: "solid"` renders a fully opaque filled label using the text surface gradient, and `textStyle: "wireframe"` renders an outlined label using the text wire gradient.

Do not introduce `textStyle: "transparent"` as a third paint control. Legacy configs with `gpuStyle: "transparent"` should normalize to `solid`.

Do not build filled letters from `<rect>`, `<line>`, or separate stem/bowl paths. Do not add a second label copy and do not replace the text with monoline lettering for outline mode.
