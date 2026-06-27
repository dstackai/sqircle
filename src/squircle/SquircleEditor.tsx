import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createSquircleReactCode } from "./codeExport";
import { DEFAULT_GEOMETRY, reflowLayerOffsets } from "./geometry";
import { SQUIRCLE_PALETTE_IDS, SQUIRCLE_PALETTES } from "./palettes";
import { SquircleScene } from "./SquircleScene";
import type { SquircleAnnotationColor, SquircleGeometryConfig, SquircleLayerConfig, SquircleMaterial, SquircleTheme, SquircleVariantConfig } from "./types";
import "./SquircleEditor.css";

const DEFAULT_LAYER_GAP = 88;
const DEFAULT_TEXT = "GPU";
const DEFAULT_EDITOR_GEOMETRY: SquircleGeometryConfig = {
  exponent: DEFAULT_GEOMETRY.exponent,
  prismHeight: DEFAULT_GEOMETRY.prismHeight,
  inlayScale: DEFAULT_GEOMETRY.inlayScale
};
const MIN_RADIUS = 0;
const MAX_RADIUS = 100;
const MIN_EXPONENT = 4;
const MAX_EXPONENT = 24;
const MIN_PRISM_HEIGHT = 4;
const MAX_PRISM_HEIGHT = 36;
const MIN_INLAY_SCALE = 0.35;
const MAX_INLAY_SCALE = 0.82;
const MIN_TEXT_SIZE = 34;
const MAX_TEXT_SIZE = 92;
const DEFAULT_TEXT_SIZE = 62;
const DEFAULT_TEXT_FONT_WEIGHT = 400;
type EditorAnnotationColor = Extract<SquircleAnnotationColor, "auto" | "white" | "black">;

const MATERIAL_OPTIONS = [
  { value: "wireframe", label: "Wire", title: "Gradient outline with transparent faces" },
  { value: "solid", label: "Solid", title: "Filled prism with top and side gradients" },
  { value: "transparent", label: "Glass", title: "Translucent filled prism" }
] satisfies { value: SquircleMaterial; label: string; title: string }[];
const TEXT_STYLE_OPTIONS = [
  { value: "solid", label: "Filled", title: "Filled top-plane text" },
  { value: "wireframe", label: "Outline", title: "Outlined top-plane text" }
] satisfies { value: "solid" | "wireframe"; label: string; title: string }[];
const ANNOTATION_COLOR_OPTIONS = [
  { value: "auto", label: "Auto", title: "Use the palette contrast color" },
  { value: "white", label: "White", title: "Use fixed white annotation paint" },
  { value: "black", label: "Black", title: "Use fixed black annotation paint" }
] satisfies { value: EditorAnnotationColor; label: string; title: string }[];
const FONT_WEIGHT_OPTIONS = [
  { value: "300", label: "Light", title: "Thin top-plane label" },
  { value: "400", label: "Regular", title: "Default top-plane label weight" },
  { value: "500", label: "Medium", title: "Slightly stronger top-plane label" },
  { value: "600", label: "Semi", title: "Bold but still clean on wireframe outlines" },
  { value: "700", label: "Bold", title: "Strongest top-plane label" }
] satisfies { value: string; label: string; title: string }[];

interface LegacyTextVariantConfig {
  gpu?: boolean;
  gpuStyle?: "solid" | "wireframe";
  gpuColor?: SquircleAnnotationColor;
}

export interface SquircleEditorProps {
  value?: SquircleLayerConfig[];
  initialLayers?: SquircleLayerConfig[];
  onChange?: (layers: SquircleLayerConfig[]) => void;
  geometry?: SquircleGeometryConfig;
  initialGeometry?: SquircleGeometryConfig;
  onGeometryChange?: (geometry: SquircleGeometryConfig) => void;
  title?: string;
  description?: string;
  /** @deprecated The editor now exports React code instead of schema-tagged JSON. */
  schema?: string;
  className?: string;
  layerGap?: number;
  showCode?: boolean;
  /** @deprecated Use showCode. */
  showConfig?: boolean;
  codeComponentName?: string;
  codeImportPath?: string;
  theme?: SquircleTheme;
  defaultTheme?: SquircleTheme;
  onThemeChange?: (theme: SquircleTheme) => void;
  showThemeSwitch?: boolean;
}

export function createDefaultSquircleEditorLayers(paletteId = "15"): SquircleLayerConfig[] {
  return reflowLayerOffsets([
    {
      id: "layer-1",
      visible: true,
      base: { material: "wireframe", paletteId }
    },
    {
      id: "layer-2",
      visible: true,
      base: { material: "wireframe", paletteId }
    },
    {
      id: "layer-3",
      visible: true,
      base: { material: "wireframe", paletteId }
    }
  ], DEFAULT_LAYER_GAP);
}

export function SquircleEditor({
  value,
  initialLayers,
  onChange,
  geometry,
  initialGeometry,
  onGeometryChange,
  title = "Squircle",
  description = "React component constructor with 0-N layers and exported code.",
  className,
  layerGap = DEFAULT_LAYER_GAP,
  showCode,
  showConfig = true,
  codeComponentName,
  codeImportPath = "./squircle",
  theme,
  defaultTheme = "light",
  onThemeChange,
  showThemeSwitch = true
}: SquircleEditorProps) {
  const [internalLayers, setInternalLayers] = useState<SquircleLayerConfig[]>(
    () => initialLayers ?? createDefaultSquircleEditorLayers()
  );
  const [internalGeometry, setInternalGeometry] = useState<SquircleGeometryConfig>(
    () => ({ ...DEFAULT_EDITOR_GEOMETRY, ...initialGeometry })
  );
  const [internalTheme, setInternalTheme] = useState<SquircleTheme>(defaultTheme);
  const layers = value ?? internalLayers;
  const activeGeometry = geometry ?? internalGeometry;
  const activeTheme = theme ?? internalTheme;
  const [selectedId, setSelectedId] = useState<string | null>(() => layers.at(-1)?.id ?? null);
  const [editingState, setEditingState] = useState<"base" | "hover">("base");
  const [codeOpen, setCodeOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;
  const selectedIndex = selectedLayer ? layers.findIndex((layer) => layer.id === selectedLayer.id) + 1 : null;
  const visibleLayerCount = layers.filter((layer) => layer.visible !== false).length;
  const shouldShowCode = showCode ?? showConfig;
  const maxOffsetY = Math.max(0, ...layers.map((layer) => layer.offset?.y ?? 0));
  const sceneConfig = useMemo(
    () => ({
      layers,
      geometry: {
        ...activeGeometry,
        viewBoxHeight: Math.max(activeGeometry.viewBoxHeight ?? DEFAULT_GEOMETRY.viewBoxHeight, maxOffsetY + 320)
      },
      selectedLayerId: selectedId
    }),
    [activeGeometry, layers, maxOffsetY, selectedId]
  );
  const reactCode = useMemo(
    () => createSquircleReactCode({
      layers,
      theme: activeTheme,
      geometry: editorGeometryForCode(activeGeometry),
      componentName: codeComponentName ?? title,
      importPath: codeImportPath,
      ariaLabel: `${title} composition`
    }),
    [activeGeometry, activeTheme, codeComponentName, codeImportPath, layers, title]
  );

  useEffect(() => {
    if (selectedId && layers.some((layer) => layer.id === selectedId)) return;
    setSelectedId(layers.at(-1)?.id ?? null);
  }, [layers, selectedId]);

  useEffect(() => {
    setCopiedCode(false);
  }, [reactCode]);

  function commitLayers(nextLayers: SquircleLayerConfig[], options: { reflow?: boolean } = {}) {
    const finalLayers = options.reflow ? reflowLayerOffsets(nextLayers, layerGap) : nextLayers;
    if (!value) setInternalLayers(finalLayers);
    onChange?.(finalLayers);
  }

  function commitGeometry(patch: SquircleGeometryConfig) {
    const nextGeometry = { ...activeGeometry, ...patch };
    if (!geometry) setInternalGeometry(nextGeometry);
    onGeometryChange?.(nextGeometry);
  }

  function updateLayer(id: string, patcher: (layer: SquircleLayerConfig) => SquircleLayerConfig) {
    commitLayers(layers.map((layer) => (layer.id === id ? patcher(layer) : layer)));
  }

  function updateBase(patch: SquircleVariantConfig) {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, (layer) => ({
      ...layer,
      base: { ...layer.base, ...patch }
    }));
  }

  function updateHover(patch: SquircleVariantConfig) {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, (layer) => ({
      ...layer,
      hover: { ...(layer.hover ?? {}), ...patch }
    }));
  }

  function addLayer() {
    const newLayer: SquircleLayerConfig = {
      id: nextLayerId(layers),
      visible: true,
      base: { material: "wireframe", paletteId: layers.at(-1)?.base.paletteId ?? "15" }
    };
    const next = [...layers, newLayer];
    setSelectedId(newLayer.id);
    setEditingState("base");
    commitLayers(next, { reflow: true });
  }

  function removeSelectedLayer() {
    if (!selectedLayer) return;
    const next = layers.filter((layer) => layer.id !== selectedLayer.id);
    setSelectedId(next.at(-1)?.id ?? null);
    setEditingState("base");
    commitLayers(next, { reflow: true });
  }

  function toggleVisibility(id: string) {
    updateLayer(id, (layer) => ({ ...layer, visible: layer.visible === false }));
  }

  function commitTheme(nextTheme: SquircleTheme) {
    if (!theme) setInternalTheme(nextTheme);
    onThemeChange?.(nextTheme);
  }

  async function copyReactCode() {
    try {
      await navigator.clipboard.writeText(reactCode);
    } catch {
      const copySource = document.createElement("textarea");
      copySource.value = reactCode;
      copySource.setAttribute("readonly", "");
      copySource.style.position = "fixed";
      copySource.style.top = "-9999px";
      document.body.append(copySource);
      copySource.select();
      document.execCommand("copy");
      copySource.remove();
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1400);
  }

  return (
    <main className={["squircle-editor", `squircle-editor-${activeTheme}`, className].filter(Boolean).join(" ")} data-theme={activeTheme} aria-label="Squircle editor">
      <header className="squircle-editor-topbar">
        <div className="topbar-title">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="topbar-actions">
          {showThemeSwitch ? (
            <div className="theme-switch" role="group" aria-label="Theme">
              <button
                type="button"
                aria-pressed={activeTheme === "light"}
                onClick={() => commitTheme("light")}
              >
                Light
              </button>
              <button
                type="button"
                aria-pressed={activeTheme === "dark"}
                onClick={() => commitTheme("dark")}
              >
                Dark
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <section className="squircle-editor-workspace">
        <aside className="side-panel layers-panel">
          <div className="panel-heading">
            <div>
              <h2>Layers</h2>
              <span>{visibleLayerCount}/{layers.length} visible</span>
            </div>
            <div className="panel-actions">
              <button type="button" className="icon-button primary-action" aria-label="Add layer" title="Add layer" onClick={addLayer}>
                <PlusIcon />
              </button>
              <button type="button" className="icon-button" aria-label="Clear layers" title="Clear layers" onClick={() => commitLayers([])}>
                <TrashIcon />
              </button>
            </div>
          </div>
          <div className="squircle-editor-layer-list">
            {[...layers].reverse().map((layer, reverseIndex) => {
              const index = layers.length - reverseIndex;
              const palette = getPalette(layer.base.paletteId);
              const material = layer.base.material ?? "wireframe";
              return (
                <article className={layer.id === selectedId ? "squircle-editor-layer-row is-active" : "squircle-editor-layer-row"} key={layer.id}>
                  <button
                    type="button"
                    className="layer-select"
                    onClick={() => setSelectedId(layer.id)}
                    title={`Edit ${layerLabel(layer.id, index, layers.length)}`}
                  >
                    <span className="layer-card-topline">
                      <span className="layer-number">{String(index).padStart(2, "0")}</span>
                      <strong>{layerLabel(layer.id, index, layers.length)}</strong>
                      <span className={`material-pill material-pill-${material}`}>{materialLabel(material)}</span>
                    </span>
                    <span className="layer-card-meta">
                      <span className="layer-palette-chip">
                        <span
                          className="palette-swatch"
                          style={{ background: `linear-gradient(135deg, ${palette.swatch[0]}, ${palette.swatch[1]})` }}
                        />
                        {palette.label}
                      </span>
                      <span className="layer-feature-tags">
                        {variantHasText(layer.base) ? <span>Text</span> : null}
                        {layer.base.dash ? <span>Dash</span> : null}
                        {layer.hover ? <span>Hover</span> : null}
                        {!variantHasText(layer.base) && !layer.base.dash && !layer.hover ? <span>Clean</span> : null}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-button layer-visibility"
                    aria-label={layer.visible === false ? "Show layer" : "Hide layer"}
                    aria-pressed={layer.visible !== false}
                    title={layer.visible === false ? "Show layer" : "Hide layer"}
                    onClick={() => toggleVisibility(layer.id)}
                  >
                    {layer.visible === false ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </article>
              );
            })}
          </div>
          <EditorSection title="Shape">
            <RangeField
              label="Radius"
              value={radiusForExponent(activeGeometry.exponent ?? DEFAULT_GEOMETRY.exponent)}
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={1}
              formatValue={(value) => `${Math.round(value)}%`}
              onChange={(radius) => commitGeometry({ exponent: exponentForRadius(radius) })}
            />
            <RangeField
              label="Height"
              value={activeGeometry.prismHeight ?? DEFAULT_GEOMETRY.prismHeight}
              min={MIN_PRISM_HEIGHT}
              max={MAX_PRISM_HEIGHT}
              step={1}
              formatValue={(value) => `${Math.round(value)}px`}
              onChange={(prismHeight) => commitGeometry({ prismHeight })}
            />
            <RangeField
              label="Dash size"
              value={(activeGeometry.inlayScale ?? DEFAULT_GEOMETRY.inlayScale) * 100}
              min={MIN_INLAY_SCALE * 100}
              max={MAX_INLAY_SCALE * 100}
              step={1}
              formatValue={(value) => `${Math.round(value)}%`}
              onChange={(inlayScale) => commitGeometry({ inlayScale: roundTo(inlayScale / 100, 2) })}
            />
          </EditorSection>
        </aside>

        <section className="squircle-editor-preview">
          <div className="preview-toolbar">
            <div>
              <h2>Preview</h2>
              <span>{selectedIndex ? `Editing Layer ${selectedIndex}` : `${visibleLayerCount} visible layers`}</span>
            </div>
            {shouldShowCode ? (
              <div className="preview-actions">
                <button
                  type="button"
                  className="code-toggle-button"
                  aria-pressed={codeOpen}
                  onClick={() => setCodeOpen((open) => !open)}
                >
                  <CodeIcon />
                  Code
                </button>
                <button
                  type="button"
                  className="copy-code-button"
                  aria-label="Copy React code"
                  title="Copy React code"
                  onClick={copyReactCode}
                >
                  <CopyIcon />
                  <span className="copy-status" aria-live="polite">{copiedCode ? "Copied" : ""}</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="preview-stage">
            <SquircleScene
              {...sceneConfig}
              theme={activeTheme}
              ariaLabel="Editable squircle composition"
              onLayerSelect={(id) => {
                setSelectedId(id);
                setEditingState("base");
              }}
            />
          </div>
          {shouldShowCode ? (
            <section className={codeOpen ? "code-panel is-open" : "code-panel"} aria-label="Generated React code">
              <header className="code-panel-header">
                <div>
                  <h2>Code</h2>
                  <p>Ready-to-use React component.</p>
                </div>
                <button
                  type="button"
                  className="copy-code-button"
                  aria-label="Copy React code"
                  title="Copy React code"
                  onClick={copyReactCode}
                >
                  <CopyIcon />
                  <span className="copy-status" aria-live="polite">{copiedCode ? "Copied" : ""}</span>
                </button>
              </header>
              {codeOpen ? <pre className="code-output"><code>{reactCode}</code></pre> : null}
            </section>
          ) : null}
        </section>

        <aside className={selectedLayer ? "side-panel inspector-panel" : "side-panel inspector-panel is-empty"}>
          {selectedLayer ? (
            <>
              <div className="inspector-heading">
                <div>
                  <span className="inspector-kicker">Selected</span>
                  <h2>{selectedIndex ? layerLabel(selectedLayer.id, selectedIndex, layers.length) : selectedLayer.id}</h2>
                  <p>{summary(selectedLayer.base)}</p>
                </div>
                <div className="panel-actions">
                  <button type="button" className="icon-button" aria-label="Close inspector" title="Close inspector" onClick={() => setSelectedId(null)}>
                    <CloseIcon />
                  </button>
                  <button type="button" className="icon-button danger" aria-label="Delete layer" title="Delete layer" onClick={removeSelectedLayer}>
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="state-switch" role="group" aria-label="Layer state">
                <button type="button" aria-pressed={editingState === "base"} onClick={() => setEditingState("base")}>
                  Base
                </button>
                <button type="button" aria-pressed={editingState === "hover"} onClick={() => setEditingState("hover")}>
                  Hover
                  {selectedLayer.hover ? <span className="state-dot" aria-hidden="true" /> : null}
                </button>
              </div>

              {editingState === "base" ? (
                <VariantEditor
                  title="Base State"
                  variant={selectedLayer.base}
                  onChange={updateBase}
                />
              ) : (
                <EditorSection title="Hover State">
                  <FeatureSwitch
                    label="Hover variant"
                    checked={Boolean(selectedLayer.hover)}
                    title="Swap this layer to another variant on hover."
                    onChange={(enabled) => {
                      updateLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        hover: enabled
                          ? {
                              ...layer.base,
                              material: layer.base.material === "wireframe" ? "solid" : "wireframe"
                            }
                          : undefined
                      }));
                    }}
                  />
                  {selectedLayer.hover ? (
                    <VariantControls
                      variant={{ ...selectedLayer.base, ...selectedLayer.hover }}
                      onChange={updateHover}
                    />
                  ) : null}
                </EditorSection>
              )}

              <EditorSection title="Stroke Widths" collapsible defaultOpen={false}>
                <RangeField
                  label="Face"
                  value={selectedLayer.stroke?.face ?? 0.35}
                  min={0}
                  max={1.5}
                  step={0.05}
                  onChange={(face) => updateLayer(selectedLayer.id, (layer) => ({ ...layer, stroke: { ...layer.stroke, face } }))}
                />
                <RangeField
                  label="Wire"
                  value={selectedLayer.stroke?.wire ?? 1.6}
                  min={0.4}
                  max={4}
                  step={0.1}
                  onChange={(wire) => updateLayer(selectedLayer.id, (layer) => ({ ...layer, stroke: { ...layer.stroke, wire } }))}
                />
                <RangeField
                  label="Dash"
                  value={selectedLayer.stroke?.dash ?? 2.2}
                  min={0.6}
                  max={5}
                  step={0.1}
                  onChange={(dash) => updateLayer(selectedLayer.id, (layer) => ({ ...layer, stroke: { ...layer.stroke, dash } }))}
                />
                <RangeField
                  label="Text outline"
                  value={selectedLayer.stroke?.labelWire ?? 1.1}
                  min={0.4}
                  max={2}
                  step={0.05}
                  onChange={(labelWire) => updateLayer(selectedLayer.id, (layer) => ({ ...layer, stroke: { ...layer.stroke, labelWire } }))}
                />
              </EditorSection>
            </>
          ) : (
            <div className="empty-note">
              <h2>No layer selected</h2>
              <button type="button" className="primary-action" onClick={addLayer}>Add layer</button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function EditorSection({
  title,
  children,
  collapsible = false,
  defaultOpen = true
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="editor-section editor-section-details" open={defaultOpen}>
        <summary>
          <h3>{title}</h3>
        </summary>
        <div className="editor-section-body">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section className="editor-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function VariantEditor({
  title,
  variant,
  onChange
}: {
  title: string;
  variant: SquircleVariantConfig;
  onChange: (patch: SquircleVariantConfig) => void;
}) {
  return (
    <EditorSection title={title}>
      <VariantControls variant={variant} onChange={onChange} />
    </EditorSection>
  );
}

function VariantControls({
  variant,
  onChange
}: {
  variant: SquircleVariantConfig;
  onChange: (patch: SquircleVariantConfig) => void;
}) {
  return (
    <div className="variant-controls">
      <SegmentedField
        label="Material"
        value={variant.material ?? "wireframe"}
        options={MATERIAL_OPTIONS}
        onChange={(material) => onChange({ material })}
      />
      <PaletteField
        value={variant.paletteId ?? "15"}
        onChange={(paletteId) => onChange({ paletteId })}
      />

      <div className="feature-grid" aria-label="Top details">
        <FeatureSwitch
          label="Text"
          checked={variantHasText(variant)}
          title="Toggle top-plane text for this state."
          onChange={(enabled) => onChange(enabled
            ? { text: variantTextValue(variant), textColor: variantTextColor(variant) }
            : { text: false, textColor: undefined }
          )}
        />
        <FeatureSwitch
          label="Dash"
          checked={variant.dash ?? false}
          title="Toggle the dashed inlay for this state."
          onChange={(enabled) => onChange(enabled
            ? { dash: true, dashColor: variantDashColor(variant) }
            : { dash: false, dashColor: undefined }
          )}
        />
      </div>

      {variantHasText(variant) ? (
        <div className="nested-fields">
          <TextField
            label="Text"
            value={variantTextValue(variant)}
            onChange={(text) => onChange({ text })}
          />
          <SegmentedField
            label="Text paint"
            value={variantTextStyle(variant)}
            options={TEXT_STYLE_OPTIONS}
            onChange={(textStyle) => onChange({ textStyle })}
          />
          <AnnotationColorField
            label="Text color"
            value={variantTextColor(variant)}
            forcedValue={forcedTextColor(variant)}
            onChange={(textColor) => onChange({ textColor })}
          />
          <RangeField
            label="Text size"
            value={variant.textSize ?? DEFAULT_TEXT_SIZE}
            min={MIN_TEXT_SIZE}
            max={MAX_TEXT_SIZE}
            step={1}
            formatValue={(value) => `${Math.round(value)}px`}
            onChange={(textSize) => onChange({ textSize })}
          />
          <SegmentedField
            label="Font weight"
            value={String(variant.textFontWeight ?? DEFAULT_TEXT_FONT_WEIGHT)}
            options={FONT_WEIGHT_OPTIONS}
            onChange={(textFontWeight) => onChange({ textFontWeight: Number(textFontWeight) })}
          />
        </div>
      ) : null}

      {variant.dash ? (
        <div className="nested-fields">
          <AnnotationColorField
            label="Dash color"
            value={variantDashColor(variant)}
            forcedValue={forcedDashColor(variant)}
            onChange={(dashColor) => onChange({ dashColor })}
          />
        </div>
      ) : null}
    </div>
  );
}

function FeatureSwitch({
  label,
  checked,
  title,
  onChange
}: {
  label: string;
  checked: boolean;
  title?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="feature-switch"
      aria-pressed={checked}
      title={title}
      onClick={() => onChange(!checked)}
    >
      <span className="feature-switch-label">{label}</span>
      <span className="feature-switch-state">{checked ? "On" : "Off"}</span>
    </button>
  );
}

function AnnotationColorField({
  label,
  value,
  forcedValue,
  onChange
}: {
  label: string;
  value: EditorAnnotationColor;
  forcedValue: string | null;
  onChange: (value: EditorAnnotationColor) => void;
}) {
  if (forcedValue) {
    return (
      <div className="field">
        <span>{label}</span>
        <div className="forced-token" title="This material controls annotation paint from the wireframe palette.">
          {forcedValue}
        </div>
      </div>
    );
  }

  return (
    <SegmentedField
      label={label}
      value={value}
      options={ANNOTATION_COLOR_OPTIONS}
      onChange={onChange}
    />
  );
}

function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented-field" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaletteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="field palette-field">
      <span>Palette</span>
      <div className="palette-grid" role="group" aria-label="Palette">
        {SQUIRCLE_PALETTE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            title={SQUIRCLE_PALETTES[id].label}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            <span
              className="palette-swatch"
              style={{
                background: `linear-gradient(135deg, ${SQUIRCLE_PALETTES[id].swatch[0]}, ${SQUIRCLE_PALETTES[id].swatch[1]})`
              }}
            />
            <span>{id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}: {formatValue ? formatValue(value) : value.toFixed(2)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CopyIcon() {
  return (
    <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6.8C5 5.8 5.8 5 6.8 5H15" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 3l18 18M9.4 5.5A10.9 10.9 0 0 1 12 5c6.1 0 9.5 7 9.5 7a15.2 15.2 0 0 1-3 4M6.7 6.9A15.5 15.5 0 0 0 2.5 12s3.4 7 9.5 7c1.1 0 2.2-.2 3.1-.6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 18 3 12l6-6M15 6l6 6-6 6" />
    </svg>
  );
}

function summary(variant: SquircleVariantConfig): string {
  const parts = [materialLabel(variant.material ?? "wireframe"), getPalette(variant.paletteId).label];
  if (variantHasText(variant)) parts.push(`text: ${variantTextValue(variant)}`);
  if (variant.dash) parts.push("dash");
  return parts.join(" / ");
}

function getPalette(paletteId: string | undefined) {
  return SQUIRCLE_PALETTES[paletteId as keyof typeof SQUIRCLE_PALETTES] ?? SQUIRCLE_PALETTES["15"];
}

function materialLabel(material: SquircleMaterial): string {
  if (material === "transparent") return "Glass";
  if (material === "solid") return "Solid";
  return "Wire";
}

function layerLabel(_id: string, index: number, _total: number): string {
  return `Layer ${index}`;
}

function nextLayerId(layers: SquircleLayerConfig[]): string {
  const usedIds = new Set(layers.map((layer) => layer.id));
  let index = layers.length + 1;
  while (usedIds.has(`layer-${index}`)) index += 1;
  return `layer-${index}`;
}

function radiusForExponent(exponent: number): number {
  const normalized = (MAX_EXPONENT - exponent) / (MAX_EXPONENT - MIN_EXPONENT);
  return clamp(Math.round(normalized * 100), MIN_RADIUS, MAX_RADIUS);
}

function exponentForRadius(radius: number): number {
  const normalized = clamp(radius, MIN_RADIUS, MAX_RADIUS) / 100;
  return roundTo(MAX_EXPONENT - normalized * (MAX_EXPONENT - MIN_EXPONENT), 1);
}

function editorGeometryForCode(geometry: SquircleGeometryConfig): SquircleGeometryConfig {
  return {
    exponent: geometry.exponent ?? DEFAULT_GEOMETRY.exponent,
    prismHeight: geometry.prismHeight ?? DEFAULT_GEOMETRY.prismHeight,
    inlayScale: geometry.inlayScale ?? DEFAULT_GEOMETRY.inlayScale
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function variantHasText(variant: SquircleVariantConfig): boolean {
  if (typeof variant.text === "string") return variant.text.trim().length > 0;
  return variant.text === true || legacyVariant(variant).gpu === true;
}

function variantTextValue(variant: SquircleVariantConfig): string {
  if (typeof variant.text === "string") return variant.text;
  if (variant.text === true || legacyVariant(variant).gpu) return DEFAULT_TEXT;
  return DEFAULT_TEXT;
}

function variantTextStyle(variant: SquircleVariantConfig): "solid" | "wireframe" {
  return variant.textStyle ?? legacyVariant(variant).gpuStyle ?? "solid";
}

function variantTextColor(variant: SquircleVariantConfig): EditorAnnotationColor {
  return normalizeAnnotationColor(variant.textColor ?? legacyVariant(variant).gpuColor ?? "contrast");
}

function variantDashColor(variant: SquircleVariantConfig): EditorAnnotationColor {
  return normalizeAnnotationColor(variant.dashColor ?? "contrast");
}

function normalizeAnnotationColor(color: SquircleAnnotationColor): EditorAnnotationColor {
  return color === "contrast" ? "auto" : color;
}

function forcedTextColor(variant: SquircleVariantConfig): string | null {
  if ((variant.material ?? "wireframe") !== "wireframe") return null;
  return variantTextStyle(variant) === "wireframe" ? "Wire gradient" : "Surface gradient";
}

function forcedDashColor(variant: SquircleVariantConfig): string | null {
  return (variant.material ?? "wireframe") === "wireframe" ? "Wire gradient" : null;
}

function legacyVariant(variant: SquircleVariantConfig): LegacyTextVariantConfig {
  return variant as SquircleVariantConfig & LegacyTextVariantConfig;
}
