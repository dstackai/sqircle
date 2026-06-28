# Color System

This file is the palette contract for variants, gradients, text labels, and edge strokes.

## Sources Of Truth

Colors are defined in `src/squircle/palettes.ts` and consumed by `SquircleScene`. The root HTML files are Vite shells and do not own gradient stops. Keep these synchronized:

1. `SQUIRCLE_PALETTES`: alpha palettes `13..20`.
2. Renderer docs in `README.md` and `docs/react/README.md`.
3. This design file.

Do not add or rename a variant in only one place.

## Gradient Geometry

All gradients use `gradientUnits="userSpaceOnUse"`.

| Gradient family | Coordinates | Meaning |
| --- | --- | --- |
| `top-*` | `x1="0" y1="0" x2="800" y2="291.18"` | Top face bbox |
| `text-surface-*` | `x1="-425.63" y1="-0.1" x2="425.6" y2="0.07"` | Matching top-face stops remapped into the text label's local projected plane |
| `side-*` | `x1="0" y1="0" x2="800" y2="301.18"` | Full top-plus-wall silhouette bbox |

The side gradient intentionally starts at `y=0`, not at the wall's visible `y=145.59`, so the side shadow continues from the same projected coordinate space.

## Variant Palette Table

| Variant | Top gradient stops | Side gradient stops | Label fill | Top edge | Side edge |
| --- | --- | --- | --- | --- | --- |
| `13 Alpha` | `0 #f5f0ff`, `0.48 #b388ff`, `1 #0099ff` | `0 #8250e6`, `0.5 #596ce8`, `1 #0084e8` | `#2a1060` | `#7c5fd0` | `#2d1466` |
| `14 Alpha` | `0 #e9fffb`, `0.44 #44b9d6`, `1 #006ce0` | `0 #38acbc`, `0.52 #268ccf`, `1 #005fc4` | `#063f6a` | `#237aa8` | `#063f6a` |
| `15 Alpha` | `0 #f0fbff`, `0.34 #0099ff`, `0.66 #5c7fff`, `1 #962eff` | `0 #008fec`, `0.34 #139cff`, `0.56 #587fff`, `0.78 #7c58f7`, `1 #962eff` | `#f7fbff` | `#7c5fd0` | `#2d1466` |
| `16 Alpha` | `0 #e9fbff`, `0.46 #75cfff`, `1 #2d49d8` | `0 #59b7ec`, `0.54 #5874e0`, `1 #263fb8` | `#10246a` | `#3e65c8` | `#10246a` |
| `17 Alpha` | `0 #edf1ff`, `0.46 #7f91ff`, `1 #0099ff` | `0 #7081ef`, `0.5 #617fee`, `1 #0084e1` | `#17245e` | `#5f6ed0` | `#17245e` |
| `18 Alpha` | `0 #f8fdff`, `0.42 #b8e7ff`, `1 #006ce0` | `0 #86d4f3`, `0.5 #5da6dd`, `1 #005dbc` | `#064272` | `#4f94c0` | `#064272` |
| `19 Alpha` | `0 #e6fff9`, `0.42 #42b4ff`, `1 #8575ff` | `0 #1ea9eb`, `0.5 #4f8cee`, `1 #7866e8` | `#12306f` | `#6470d8` | `#12306f` |
| `20 Alpha` | `0 #eef3ff`, `0.38 #5c7fff`, `0.7 #0099ff`, `1 #b8e7ff` | `0 #536fe8`, `0.52 #168fe8`, `1 #8fd2ee` | `#17245e` | `#5a7bd0` | `#17245e` |

The text surface gradient repeats the matching `top-*` stops with label-local coordinates. It is used when a wireframe squircle has `textStyle: "solid"`, so filled text reads as top surface material instead of pale wire line-art.

## CSS Variable Contract

Legacy static snapshots used CSS variables such as `--top-fill` and `--side-fill`. New React work should not edit those snapshots as source of truth. If a legacy static snapshot must be refreshed, keep every selected-variant selector targeting both `.hero-card` and `.single-drawer`:

```css
#variant-15:checked ~ .hero-card,
#variant-15:checked ~ .single-drawer {
  --top-fill: url("#top-15");
  --side-fill: url("#side-15");
  --text-surface-fill: url("#text-surface-15");
  --label-fill: #f7fbff;
  --top-edge: #7c5fd0;
  --side-edge: #2d1466;
}
```

Every `.v13..v20` class must define the same core variables for variant cards:

```css
.v15 {
  --top-fill: url("#top-15");
  --side-fill: url("#side-15");
  --label-fill: #f7fbff;
  --text-surface-fill: url("#text-surface-15");
  --top-edge: #7c5fd0;
  --side-edge: #2d1466;
}
```

Variant classes may also define fallback ghost colors, but those must remain visually compatible with the top and side gradients.

## Hover Palettes

React examples and generated code can use any palette id as a layer's hover `paletteId`. The base variant keeps its normal palette, and the hover variant receives its own `paletteId`. This means hover color changes use the same documented gradients, automatic annotation paint, and wireframe stroke colors as normal rendering.

Do not implement hover color with filters, opacity hacks, or untracked ad hoc colors. Hover color is a normal palette swap. Hover `paletteId` may be the same id as the base `paletteId`; that is useful when hover should change only material while preserving color. If the resolved hover variant matches the base variant, `SquircleScene` should not render or crossfade a hover copy.

## Annotation Auto And Overrides

React layers with `textColor: "auto"` and `lineColor: "auto"` use the palette's automatic annotation colors. Solid and transparent top-plane annotations use the palette `labelFill`. This applies to both filled text and solid line inlays, so default text + line states keep one automatic annotation color.

- Darker top gradients may use a near-white label. Current example: `15 Alpha` uses `#f7fbff`.
- Lighter top gradients should use dark in-family annotation colors.
- Do not add a second outline copy for automatic annotation paint.

Wireframe text labels ignore fixed label paint and use gradient wire paint:

```css
fill: none !important;
stroke: url("#...text-wire...");
stroke-width: var(--label-wire-width);
```

Wireframe inlays use the top-face gradient.

In React, `textStyle: "wireframe"` outlines the same live SVG text element used by filled mode. On solid/transparent material, outline paint comes from `textColor`; `auto` resolves to `labelFill`, matching filled text and solid line. On wireframe material, outline paint comes from label-local `textWire` gradients; do not sample the full-face top ramp there, and do not replace the text with single-stroke lettering.

`SquircleVariantConfig` supports explicit annotation overrides:

| Field | Values | Paint |
| --- | --- | --- |
| `textColor` | `auto`, `white`, `black` | Filled or outlined text paint for solid/transparent material |
| `textStyle` | `solid`, `wireframe` | Filled or outlined text label |
| `lineColor` | `auto`, `white`, `black` | Line stroke for solid/transparent material |

Use `auto` when the annotation should follow the palette. Use `white` or `black` only when the user deliberately wants fixed annotation paint. On wireframe material, line always uses the top gradient; text uses the text surface gradient at full opacity when `textStyle` is `solid` and the text wire gradient when `textStyle` is `wireframe`.

## Edge Colors

Filled faces use:

- `--top-edge` for filled top-face edges and legacy `.ghost-top` snapshots
- `--side-edge` for filled side-wall edges and legacy `.ghost-side` snapshots
- `--face-edge-width: 0.35`
- `--face-edge-opacity: 0.72`

Edge colors must be darker members of the same family as the face gradient. Never use black.

## Wireframe Colors

Wireframe mode and `.single-wire` use the top gradient for all visible line art:

- Prism strokes: `var(--top-fill)`
- Hidden back edge: `var(--top-fill)`
- Wire inlay: `var(--top-fill)`
- Wire text: `var(--top-fill)`

This is intentional: light does not interact with a wireframe surface, so top and lower curves should match instead of using separate side lighting.

## Adding A Variant

When adding a new palette:

1. Add it to `SQUIRCLE_PALETTES`.
2. Include top, side, text-wire, label fill, top edge, side edge, and swatch values.
3. Update the palette table above.
4. Render the examples and constructor controls.
