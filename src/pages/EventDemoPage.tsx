import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SquircleScene, SQUIRCLE_PALETTES, reflowLayerOffsets } from "../squircle";
import type { SquircleLayerConfig, SquircleLayerHoverResolver, SquircleTheme } from "../squircle";
import { PageShell } from "./PageShell";
import { PAGE_LAYER_GAP, PAGE_PALETTES } from "./exampleData";
import "./pages.css";

const siblingWireframeHover: SquircleLayerHoverResolver = ({ layer, hoveredLayerId }) => {
  if (layer.id === hoveredLayerId) return false;

  return {
    material: "wireframe"
  };
};

function EventDemoPage() {
  const [theme, setTheme] = useState<SquircleTheme>("light");
  const [paletteId, setPaletteId] = useState("15");
  const baseLayers = useMemo(() => createEventBaseLayers(paletteId), [paletteId]);

  return (
    <PageShell
      title="Function hover demo"
      description="A React scene where each layer's hover resolver can react to the hovered layer."
      theme={theme}
      onThemeChange={setTheme}
    >
      <section className="sq-event-layout">
        <div className="sq-stage sq-event-stage">
          <SquircleScene
            layers={baseLayers}
            theme={theme}
            ariaLabel="Function hover squircle scene"
            idPrefix="events-controlled"
          />
        </div>

        <aside className="sq-control-panel sq-event-panel">
          <h2>Palette</h2>
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

          <div className="sq-event-state" aria-label="Hover state">
            <h2>Hover State</h2>
            <div className="sq-event-pill-row">
              {baseLayers.map((layer) => (
                <span
                  key={layer.id}
                  className="sq-event-pill"
                >
                  {layer.id}
                  <small>siblings become wireframe on hover</small>
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function createEventBaseLayers(paletteId: string): SquircleLayerConfig[] {
  return reflowLayerOffsets([
    {
      id: "bottom",
      base: { material: "solid", paletteId, effect: "off", line: "dashed" },
      hover: siblingWireframeHover
    },
    {
      id: "middle",
      base: { material: "transparent", paletteId: "18", text: "{}", textStyle: "wireframe" },
      hover: siblingWireframeHover
    },
    {
      id: "top",
      base: { material: "solid", paletteId, effect: "off", text: "GPU", textStyle: "solid", line: "dashed" },
      hover: siblingWireframeHover
    }
  ], PAGE_LAYER_GAP);
}

createRoot(document.getElementById("root")!).render(<EventDemoPage />);
