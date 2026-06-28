# Editor Guide

`SquircleEditor` is the optional constructor UI for building `SquircleScene` layer configs and copying ready-to-use React code. Keep renderer details in [README.md](./README.md); this file owns editor behavior, editor props, and code export.

## Files

- `src/squircle/SquircleEditor.tsx`: reusable constructor UI.
- `src/squircle/SquircleEditor.css`: editor shell, layer list, inspector, preview, and responsive styles.
- `src/squircle/codeExport.ts`: serializes editor state into a copyable `SquircleScene` component snippet.
- `src/pages/ConstructorPage.tsx`: local example page that mounts `SquircleEditor`.

## Usage

```tsx
import { SquircleEditor } from "@dstackai/sqircle";
import "@dstackai/sqircle/style.css";

export function Constructor() {
  return (
    <SquircleEditor
      title="Squircle Constructor"
      codeImportPath="@dstackai/sqircle"
      showCode
    />
  );
}
```

Use controlled state when the host app owns layer, geometry, or theme data:

```tsx
<SquircleEditor
  value={layers}
  onChange={setLayers}
  geometry={geometry}
  onGeometryChange={setGeometry}
  theme={theme}
  onThemeChange={setTheme}
  storageKey="my-app:squircle-editor"
/>
```

## UX Model

The editor is organized as three zones:

- `Layers`: cards with material, palette, text/dash/hover tags, and an eye icon for visibility. Add and clear actions live beside the layer count. Scene Camera is collapsed below the list.
- `Preview`: the live `SquircleScene` stage. Clicking a squircle selects that layer. When `showCode` is enabled, the Code drawer can be opened without permanently shrinking the stage; the copy icon is available from the preview toolbar and the drawer header.
- `Inspector`: selected-layer editing. Geometry controls edit the selected layer; `Base` and `Hover` are explicit state tabs, and both states use the same variant controls.

On desktop, the editor workspace has a fixed app-like height and the side panels scroll internally. This keeps the preview stage stable when toggling controls such as Text or Dash; annotations must never appear to move layer positions.

The controls are intentionally visual: material and text-paint choices use segmented buttons, text/dash/hover use action chips, palette choices use swatches, and editable annotation colors use `Auto / White / Black` segmented controls. Avoid generic dropdowns or checkboxes unless the option set becomes too large to scan.

Hover editing is a pure variant swap. Enabling hover creates a hover variant by copying the base state and flipping the material (`wireframe` <-> `solid`) as a starting point. No hover control should add transforms, filters, shadows, spacing changes, or layer-gap changes.

When `storageKey` is provided, the uncontrolled editor persists layers, scene geometry, theme, selected layer, active Base/Hover tab, and Code drawer state to `localStorage`. The local `constructor.html` example uses `@dstackai/sqircle:constructor`, so refreshes restore the last working state. Omit `storageKey` or pass `false` for a fresh editor on every load.

## Editor Options

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `value` | `SquircleLayerConfig[]` | uncontrolled | Controlled layer state. Pair with `onChange`. |
| `initialLayers` | `SquircleLayerConfig[]` | three wireframe layers | Initial uncontrolled layer state. |
| `onChange` | `(layers) => void` | none | Receives layer updates. |
| `geometry` | `SquircleGeometryConfig` | uncontrolled | Controlled scene-level geometry defaults, camera, and viewBox settings. Layer shape controls write to `layer.geometry`. |
| `initialGeometry` | `SquircleGeometryConfig` | editor defaults | Initial uncontrolled scene-level geometry defaults. |
| `onGeometryChange` | `(geometry) => void` | none | Compatibility callback for controlled scene geometry. Built-in shape controls now update layers. |
| `title` | `string` | `Squircle` | Editor heading and generated component-name fallback. |
| `description` | `string` | constructor description | Editor subtitle. |
| `schema` | `string` | none | Deprecated compatibility prop; unused by the React-code exporter. |
| `className` | `string` | none | Extra class on the editor root. |
| `layerGap` | `number` | `88` | Gap used when adding/removing layers with `reflowLayerOffsets()`. |
| `showCode` | `boolean` | `showConfig` | Shows the React Code drawer. |
| `showConfig` | `boolean` | `true` | Deprecated alias for `showCode`. |
| `codeComponentName` | `string` | `title` | Generated React component name. |
| `codeImportPath` | `string` | `./squircle` | Import path used by the generated code. |
| `theme` | `light`, `dark` | uncontrolled | Controlled editor and preview theme. Pair with `onThemeChange`. |
| `defaultTheme` | `light`, `dark` | `light` | Initial uncontrolled editor theme. |
| `onThemeChange` | `(theme) => void` | none | Receives theme updates. |
| `showThemeSwitch` | `boolean` | `true` | Shows the Light/Dark switcher. |
| `storageKey` | `string \| false` | none | Enables localStorage persistence for editor state when a string key is provided. |

## Editor Coverage

The editor exposes the common constructor surface:

- layer add/delete/visibility and preview selection
- theme
- scene camera level
- per-layer radius, height, and dash size
- base material, palette, effect, text, text paint, text color, text size, font weight, dash, and dash color
- hover material, palette, effect, text, text paint, text color, text size, font weight, dash, and dash color
- collapsed stroke width controls for face, wire, dash, and text outline
- generated React code

Persisted state is intentionally UI-local and not part of `createSquircleReactCode()`. The copied React code remains the portable source for handoff to another agent.

Layer labels are generic (`Layer 1`, `Layer 2`, ...), because the editor supports 0-N layers. The array order remains draw order: lower-numbered layers are lower/backmost, and higher-numbered layers sit above them after `reflowLayerOffsets()`.

Supported renderer API fields that remain intentionally code-only in the editor:

- advanced text typography: `textFontFamily`
- advanced opacity: `transparentFace`, `transparentAnnotation`, `solidAnnotation`
- deeper stroke tuning: `faceOpacity`, `wireOpacity`, `hidden`, `hiddenOpacity`, `wireDash`
- advanced shared geometry beyond Camera level and per-layer Radius/Height/Dash size: `center`, `width`, `viewBoxHeight`, `samples`, `halfSize`
- manual layer offsets and scene fitting

The `Effect` segmented control appears only when the edited state has `material: "solid"`. It writes `effect: "off" | "fluid" | "frosted"`. The renderer ignores this field for `transparent` and `wireframe`, so hiding the control for those materials avoids implying that it changes glass or wire states.

## Annotation Rules

Annotation color controls are contextual. Text color appears after enabling text; dash color appears after enabling dash. Wireframe material owns annotation paint through gradients, so the editor shows the forced gradient token instead of pretending `Auto / White / Black` would apply.

`Auto` is the default annotation color. Enabling text or dash writes `auto` explicitly unless the layer already has a color choice. Text size and font weight appear with the text controls because they are per-variant typography settings.

Radius, Height, and Dash size live in the selected-layer Geometry section, collapsed by default. Radius maps to `layer.geometry.exponent`, Height maps to `layer.geometry.prismHeight`, and Dash size maps to `layer.geometry.inlayScale`. Layers without an override inherit from scene `geometry` and the component defaults until a slider is changed.

Camera level lives in the left-panel Scene Camera section, collapsed by default. It maps to scene `geometry.angleDegrees`, so it changes the projection for the whole composition. Lower values are more side-on; higher values show more of the top face.

## Code Export

`showConfig` remains as a deprecated compatibility alias for `showCode`; new callers should use `showCode`. The Code drawer shows actual TSX: it imports `SquircleScene`, defines a typed `SquircleLayerConfig[]`, includes the active `theme`, and renders a ready-to-use component. The icon button copies that React code to the clipboard.

When `codeImportPath="@dstackai/sqircle"`, generated code also imports `@dstackai/sqircle/style.css`. Set `styleImportPath={false}` through `createSquircleReactCode()` if a host app already bundles the component CSS another way.

Use the exporter directly when you need the same code string outside the full editor:

```ts
import { createSquircleReactCode } from "@dstackai/sqircle";

const code = createSquircleReactCode({
  theme: "light",
  layers,
  geometry,
  componentName: "CustomSquircle",
  importPath: "@dstackai/sqircle"
});
```

### `createSquircleReactCode()`

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `layers` | `SquircleLayerConfig[]` | required | Layers to serialize into TSX. |
| `theme` | `SquircleTheme` | required | Theme to serialize into TSX. |
| `geometry` | `SquircleGeometryConfig` | none | Optional geometry object to serialize. |
| `componentName` | `string` | `CustomSquircle` | Generated component name. Sanitized with `toComponentName()`. |
| `importPath` | `string` | `./squircle` | Import path for `SquircleScene` and types. |
| `styleImportPath` | `string \| false` | auto for `@dstackai/sqircle` | CSS import path. Set `false` to omit CSS import. |
| `ariaLabel` | `string` | `${componentName} composition` | Serialized `ariaLabel` for `SquircleScene`. |

## Verification

Run:

```sh
npm run typecheck
npm run build
npm run build:demo
```

Then open `/constructor.html` from the Vite dev server and verify:

- three default wireframe layers render.
- click selection works in the layer list and preview.
- visibility, add, delete, theme switching, and selected-layer shape controls update the preview.
- base and hover state tabs expose the same variant controls.
- palette and effect changes update the preview and copied code.
- reload preserves constructor state when `storageKey` is set.
- no-op hover layers do not blink.
- copied React code imports the expected package path and includes active layers, per-layer geometry overrides, theme, and scene camera geometry.
