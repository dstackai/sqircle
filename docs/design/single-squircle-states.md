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
    dash: true
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
| Solid Dash | `{ material: "solid", dash: true }` |
| Solid Text + Dash | `{ material: "solid", text: "GPU", textStyle: "solid", dash: true }` |
| Transparent | `{ material: "transparent" }` |
| Transparent Text | `{ material: "transparent", text: "GPU", textStyle: "solid" }` |
| Transparent Text Outline + Dash | `{ material: "transparent", text: "GPU", textStyle: "wireframe", dash: true }` |
| Wireframe | `{ material: "wireframe" }` |
| Wireframe Text Filled | `{ material: "wireframe", text: "GPU", textStyle: "solid" }` |
| Wireframe Text Outline | `{ material: "wireframe", text: "GPU", textStyle: "wireframe" }` |
| Wireframe Text Outline + Dash | `{ material: "wireframe", text: "GPU", textStyle: "wireframe", dash: true }` |

The local `index.html` example renders these through `createSingleStatePresets()` in `src/pages/exampleData.ts`.

## Paint Rules

- Solid and transparent text + dash states use palette contrast paint by default.
- Solid/transparent `textColor` and `dashColor` may be `contrast`, `white`, or `black`.
- Wireframe dash always uses the wire gradient.
- Wireframe `textStyle: "wireframe"` uses the label-local text wire gradient.
- Wireframe `textStyle: "solid"` uses the text surface gradient at full opacity.

## Ordering Rules

`SquircleScene` draws a variant in this order:

1. Prism side/top or wireframe prism.
2. Dashed inlay, when enabled.
3. Live SVG text, when enabled.

Do not create two text copies for filled and outline states. The same live `<text>` object changes only paint.
