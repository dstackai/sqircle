import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SquircleScene, SQUIRCLE_PALETTES, getSquirclePaletteSwatch } from "../squircle";
import type { SquircleTheme } from "../squircle";
import { PageShell } from "./PageShell";
import { PAGE_PALETTES, createHeroLayers, createSingleStatePresets } from "./exampleData";
import "./pages.css";

function IndexPage() {
  const [theme, setTheme] = useState<SquircleTheme>("light");
  const [paletteId, setPaletteId] = useState("15");
  const [selectedSingleId, setSelectedSingleId] = useState("single-5");
  const singlePresets = useMemo(() => createSingleStatePresets(paletteId), [paletteId]);
  const heroLayers = useMemo(() => createHeroLayers(paletteId), [paletteId]);
  const selectedSingle = singlePresets.find((preset) => preset.id === selectedSingleId) ?? singlePresets[0];

  return (
    <PageShell
      title="React squircle examples"
      description="Root examples now render through the reusable component instead of static SVG markup."
      theme={theme}
      onThemeChange={setTheme}
    >
      <section className="sq-hero-grid">
        <div className="sq-stage sq-hero-stage">
          <SquircleScene
            layers={heroLayers}
            theme={theme}
            ariaLabel="Three-layer squircle hero"
            idPrefix="index-hero"
          />
        </div>
        <aside className="sq-control-panel">
          <h2>Palette</h2>
          <div className="sq-palette-grid">
            {PAGE_PALETTES.map((id) => {
              const swatch = getSquirclePaletteSwatch(id, theme);

              return (
                <button
                  key={id}
                  type="button"
                  className={paletteId === id ? "sq-swatch is-active" : "sq-swatch"}
                  aria-pressed={paletteId === id}
                  onClick={() => setPaletteId(id)}
                >
                  <span style={{ background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})` }} />
                  {SQUIRCLE_PALETTES[id].label}
                </button>
              );
            })}
          </div>
        </aside>
      </section>

      <details className="sq-drawer" open>
        <summary>Single squircle states</summary>
        <div className="sq-selected-single">
          <div className="sq-stage">
            <SquircleScene
              layers={selectedSingle.layers}
              theme={theme}
              ariaLabel={selectedSingle.name}
              idPrefix={`index-${selectedSingle.id}`}
            />
          </div>
          <div>
            <h2>{selectedSingle.name}</h2>
            <p>{selectedSingle.note}</p>
          </div>
        </div>
        <div className="sq-card-grid">
          {singlePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={preset.id === selectedSingle.id ? "sq-variant-button is-active" : "sq-variant-button"}
              onClick={() => setSelectedSingleId(preset.id)}
            >
              <SquircleScene
                layers={preset.layers}
                theme={theme}
                ariaLabel={preset.name}
                idPrefix={`single-thumb-${preset.id}`}
                geometry={{ width: 360, viewBoxHeight: 240 }}
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

createRoot(document.getElementById("root")!).render(<IndexPage />);
