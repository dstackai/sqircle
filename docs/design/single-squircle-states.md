# Single-Squircle State Constructors

This file describes reusable one-layer constructors for `SquircleScene`. Use these recipes when another agent wants one squircle outside a full multi-layer composition.

## Base Layer Shape

```ts
import type { SquircleLayerConfig } from "@dstackai/sqircle";

const layer: SquircleLayerConfig = {
  id: "single",
  base: {
    material: "solid",
    paletteId: "15",
    text: "GPU",
    textStyle: "solid",
    line: "dashed"
  }
};
```

`GPU` is only example text. Any string is valid, including `"{}"` or `"CUDA"`.

## Constructor Matrix

| State | Config |
| --- | --- |
| Solid | `{ material: "solid" }` |
| Solid Text | `{ material: "solid", text: "GPU", textStyle: "solid" }` |
| Solid Text Outline | `{ material: "solid", text: "GPU", textStyle: "wireframe" }` |
| Solid Line | `{ material: "solid", line: "solid" }` |
| Solid Text + Dotted Line | `{ material: "solid", text: "GPU", textStyle: "solid", line: "dotted" }` |
| Solid Grain | `{ material: "solid", grain: true }` |
| Solid Metal Grain Text + Dashed Line | `{ material: "solid", effect: "metal", grain: true, text: "GPU", textStyle: "solid", line: "dashed" }` |
| Solid Mesh Grain Text Outline + Solid Line | `{ material: "solid", effect: "mesh", grain: true, text: "{}", textStyle: "wireframe", line: "solid" }` |
| Transparent | `{ material: "transparent" }` |
| Transparent Text | `{ material: "transparent", text: "GPU", textStyle: "solid" }` |
| Transparent Text Outline + Dotted Line | `{ material: "transparent", text: "GPU", textStyle: "wireframe", line: "dotted" }` |
| Transparent Grain | `{ material: "transparent", grain: true }` |
| Transparent Metal Grain Text + Dashed Line | `{ material: "transparent", effect: "metal", grain: true, text: "AI", textStyle: "solid", line: "dashed" }` |
| Transparent Mesh Grain Text Outline + Solid Line | `{ material: "transparent", effect: "mesh", grain: true, text: "CUDA", textStyle: "wireframe", line: "solid" }` |
| Wireframe | `{ material: "wireframe" }` |
| Wireframe Text Filled | `{ material: "wireframe", text: "GPU", textStyle: "solid" }` |
| Wireframe Text Outline | `{ material: "wireframe", text: "GPU", textStyle: "wireframe" }` |
| Wireframe Text Outline + Dashed Line | `{ material: "wireframe", text: "GPU", textStyle: "wireframe", line: "dashed" }` |

The local `index.html` example renders these through `createSingleStatePresets()` in `src/pages/exampleData.ts`.

## Paint Rules

- Solid and transparent text + line states use palette automatic annotation paint by default.
- Solid/transparent `textColor` and `lineColor` may be `auto`, `white`, or `black`.
- Solid and transparent states may use `effect: "off" | "metal" | "mesh"` and optional `grain: true`.
- Wireframe line always uses the wire gradient.
- Wireframe `textStyle: "wireframe"` uses the label-local text wire gradient.
- Wireframe `textStyle: "solid"` uses the text surface gradient at full opacity.

## Ordering Rules

`SquircleScene` draws a variant in this order:

1. Prism side/top or wireframe prism.
2. Line inlay, when enabled.
3. Live SVG text, when enabled.

Do not create two text copies for filled and outline states. The same live `<text>` object changes only paint.
