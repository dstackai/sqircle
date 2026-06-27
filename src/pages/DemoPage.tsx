import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SquircleScene, SQUIRCLE_PALETTES } from "../squircle";
import type { SquircleTheme } from "../squircle";
import { PageShell } from "./PageShell";
import { PAGE_PALETTES, createCompositionPresets } from "./exampleData";
import "./pages.css";

function DemoPage() {
  const [theme, setTheme] = useState<SquircleTheme>("light");
  const [paletteId, setPaletteId] = useState("15");
  const presets = useMemo(() => createCompositionPresets(paletteId, 96), [paletteId]);
  const [selectedId, setSelectedId] = useState("composition-1");
  const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0];

  return (
    <PageShell
      title="Composition demo"
      description="A React-generated gallery of selectable 3-layer compositions. Hover a visible squircle to test its state and color swap."
      theme={theme}
      onThemeChange={setTheme}
    >
      <section className="sq-demo-layout">
        <aside className="sq-control-panel sq-demo-sidebar">
          <h2>Color</h2>
          <div className="sq-palette-list">
            {PAGE_PALETTES.map((id) => (
              <button
                key={id}
                type="button"
                className={paletteId === id ? "sq-swatch is-active" : "sq-swatch"}
                aria-pressed={paletteId === id}
                onClick={() => setPaletteId(id)}
              >
                <span style={{ background: `linear-gradient(135deg, ${SQUIRCLE_PALETTES[id].swatch[0]}, ${SQUIRCLE_PALETTES[id].swatch[1]})` }} />
                {SQUIRCLE_PALETTES[id].label}
              </button>
            ))}
          </div>
        </aside>

        <section className="sq-demo-main">
          <div className="sq-stage sq-demo-stage">
            <SquircleScene
              layers={selected.layers}
              theme={theme}
              ariaLabel={selected.name}
              idPrefix={`demo-main-${selected.id}`}
            />
          </div>
          <div className="sq-demo-caption">
            <h2>{selected.name}</h2>
            <p>{selected.note}</p>
          </div>
        </section>
      </section>

      <details className="sq-drawer" open>
        <summary>Preset compositions</summary>
        <div className="sq-card-grid sq-card-grid-dense">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={preset.id === selected.id ? "sq-variant-button is-active" : "sq-variant-button"}
              onClick={() => setSelectedId(preset.id)}
            >
              <SquircleScene
                layers={preset.layers}
                theme={theme}
                ariaLabel={preset.name}
                idPrefix={`demo-thumb-${preset.id}`}
                geometry={{ width: 360, viewBoxHeight: 300 }}
              />
              <strong>{preset.name}</strong>
              <span>{preset.note}</span>
            </button>
          ))}
        </div>
      </details>
    </PageShell>
  );
}

createRoot(document.getElementById("root")!).render(<DemoPage />);
