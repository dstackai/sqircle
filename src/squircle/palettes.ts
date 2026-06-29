export interface SquircleGradientStop {
  offset: number;
  color: string;
}

export interface SquirclePaletteTheme {
  top?: SquircleGradientStop[];
  side?: SquircleGradientStop[];
  wire?: SquircleGradientStop[];
  textWire?: SquircleGradientStop[];
  labelFill?: string;
  topEdge?: string;
  sideEdge?: string;
  swatch?: [string, string];
}

export interface SquirclePalette {
  id: string;
  label: string;
  top: SquircleGradientStop[];
  side: SquircleGradientStop[];
  wire?: SquircleGradientStop[];
  textWire: SquircleGradientStop[];
  labelFill: string;
  topEdge: string;
  sideEdge: string;
  swatch: [string, string];
  dark?: SquirclePaletteTheme;
}

export const SQUIRCLE_PALETTES = {
  "13": {
    id: "13",
    label: "13 Alpha",
    top: [
      { offset: 0, color: "#f5f0ff" },
      { offset: 0.48, color: "#b388ff" },
      { offset: 1, color: "#0099ff" }
    ],
    side: [
      { offset: 0, color: "#8250e6" },
      { offset: 0.5, color: "#596ce8" },
      { offset: 1, color: "#0084e8" }
    ],
    textWire: [
      { offset: 0, color: "#b388ff" },
      { offset: 0.52, color: "#5c7fff" },
      { offset: 1, color: "#0099ff" }
    ],
    labelFill: "#2a1060",
    topEdge: "#7c5fd0",
    sideEdge: "#2d1466",
    swatch: ["#b388ff", "#0099ff"]
  },
  "14": {
    id: "14",
    label: "14 Alpha",
    top: [
      { offset: 0, color: "#e9fffb" },
      { offset: 0.44, color: "#44b9d6" },
      { offset: 1, color: "#006ce0" }
    ],
    side: [
      { offset: 0, color: "#38acbc" },
      { offset: 0.52, color: "#268ccf" },
      { offset: 1, color: "#005fc4" }
    ],
    textWire: [
      { offset: 0, color: "#44b9d6" },
      { offset: 0.52, color: "#2f8fe2" },
      { offset: 1, color: "#006ce0" }
    ],
    labelFill: "#063f6a",
    topEdge: "#237aa8",
    sideEdge: "#063f6a",
    swatch: ["#44b9d6", "#006ce0"]
  },
  "15": {
    id: "15",
    label: "15 Alpha",
    top: [
      { offset: 0, color: "#f0fbff" },
      { offset: 0.34, color: "#0099ff" },
      { offset: 0.66, color: "#5c7fff" },
      { offset: 1, color: "#962eff" }
    ],
    side: [
      { offset: 0, color: "#008fec" },
      { offset: 0.34, color: "#139cff" },
      { offset: 0.56, color: "#587fff" },
      { offset: 0.78, color: "#7c58f7" },
      { offset: 1, color: "#962eff" }
    ],
    textWire: [
      { offset: 0, color: "#0099ff" },
      { offset: 0.52, color: "#5c7fff" },
      { offset: 1, color: "#962eff" }
    ],
    labelFill: "#f7fbff",
    topEdge: "#7c5fd0",
    sideEdge: "#2d1466",
    swatch: ["#0099ff", "#962eff"]
  },
  "16": {
    id: "16",
    label: "16 Alpha",
    top: [
      { offset: 0, color: "#e9fbff" },
      { offset: 0.46, color: "#75cfff" },
      { offset: 1, color: "#2d49d8" }
    ],
    side: [
      { offset: 0, color: "#59b7ec" },
      { offset: 0.54, color: "#5874e0" },
      { offset: 1, color: "#263fb8" }
    ],
    textWire: [
      { offset: 0, color: "#75cfff" },
      { offset: 0.52, color: "#5c7fff" },
      { offset: 1, color: "#2d49d8" }
    ],
    labelFill: "#10246a",
    topEdge: "#3e65c8",
    sideEdge: "#10246a",
    swatch: ["#75cfff", "#2d49d8"]
  },
  "17": {
    id: "17",
    label: "17 Alpha",
    top: [
      { offset: 0, color: "#edf1ff" },
      { offset: 0.46, color: "#7f91ff" },
      { offset: 1, color: "#0099ff" }
    ],
    side: [
      { offset: 0, color: "#7081ef" },
      { offset: 0.5, color: "#617fee" },
      { offset: 1, color: "#0084e1" }
    ],
    textWire: [
      { offset: 0, color: "#7f91ff" },
      { offset: 0.52, color: "#5c9fff" },
      { offset: 1, color: "#0099ff" }
    ],
    labelFill: "#17245e",
    topEdge: "#5f6ed0",
    sideEdge: "#17245e",
    swatch: ["#7f91ff", "#0099ff"]
  },
  "18": {
    id: "18",
    label: "18 Alpha",
    top: [
      { offset: 0, color: "#f8fdff" },
      { offset: 0.42, color: "#b8e7ff" },
      { offset: 1, color: "#006ce0" }
    ],
    side: [
      { offset: 0, color: "#86d4f3" },
      { offset: 0.5, color: "#5da6dd" },
      { offset: 1, color: "#005dbc" }
    ],
    textWire: [
      { offset: 0, color: "#b8e7ff" },
      { offset: 0.52, color: "#42b4ff" },
      { offset: 1, color: "#006ce0" }
    ],
    labelFill: "#064272",
    topEdge: "#4f94c0",
    sideEdge: "#064272",
    swatch: ["#b8e7ff", "#006ce0"]
  },
  "19": {
    id: "19",
    label: "19 Alpha",
    top: [
      { offset: 0, color: "#e6fff9" },
      { offset: 0.42, color: "#42b4ff" },
      { offset: 1, color: "#8575ff" }
    ],
    side: [
      { offset: 0, color: "#1ea9eb" },
      { offset: 0.5, color: "#4f8cee" },
      { offset: 1, color: "#7866e8" }
    ],
    textWire: [
      { offset: 0, color: "#42b4ff" },
      { offset: 0.52, color: "#5c7fff" },
      { offset: 1, color: "#8575ff" }
    ],
    labelFill: "#12306f",
    topEdge: "#6470d8",
    sideEdge: "#12306f",
    swatch: ["#42b4ff", "#8575ff"]
  },
  "20": {
    id: "20",
    label: "20 Alpha",
    top: [
      { offset: 0, color: "#eef3ff" },
      { offset: 0.38, color: "#5c7fff" },
      { offset: 0.7, color: "#0099ff" },
      { offset: 1, color: "#b8e7ff" }
    ],
    side: [
      { offset: 0, color: "#536fe8" },
      { offset: 0.52, color: "#168fe8" },
      { offset: 1, color: "#8fd2ee" }
    ],
    textWire: [
      { offset: 0, color: "#5c7fff" },
      { offset: 0.52, color: "#0099ff" },
      { offset: 1, color: "#b8e7ff" }
    ],
    labelFill: "#17245e",
    topEdge: "#5a7bd0",
    sideEdge: "#17245e",
    swatch: ["#5c7fff", "#b8e7ff"]
  },
  "21": {
    id: "21",
    label: "21 Mono",
    top: [
      { offset: 0, color: "#d8dee6" },
      { offset: 0.5, color: "#96a1ae" },
      { offset: 1, color: "#475364" }
    ],
    side: [
      { offset: 0, color: "#b0bac7" },
      { offset: 0.52, color: "#728093" },
      { offset: 1, color: "#344153" }
    ],
    wire: [
      { offset: 0, color: "#bac3cf" },
      { offset: 0.24, color: "#8794a4" },
      { offset: 0.5, color: "#526175" },
      { offset: 0.76, color: "#3b4a5e" },
      { offset: 1, color: "#283648" }
    ],
    textWire: [
      { offset: 0, color: "#bac3cf" },
      { offset: 0.32, color: "#8794a4" },
      { offset: 0.66, color: "#526175" },
      { offset: 1, color: "#283648" }
    ],
    labelFill: "#f8fafc",
    topEdge: "#8793a2",
    sideEdge: "#2d3848",
    swatch: ["#d8dee6", "#475364"],
    dark: {
      top: [
        { offset: 0, color: "#f8fbff" },
        { offset: 0.5, color: "#b9c5d2" },
        { offset: 1, color: "#647385" }
      ],
      side: [
        { offset: 0, color: "#d6dee8" },
        { offset: 0.52, color: "#929faf" },
        { offset: 1, color: "#4a586b" }
      ],
      wire: [
        { offset: 0, color: "#f8fbff" },
        { offset: 0.24, color: "#b8c4d1" },
        { offset: 0.5, color: "#75889f" },
        { offset: 0.76, color: "#c7d2df" },
        { offset: 1, color: "#e3ebf3" }
      ],
      textWire: [
        { offset: 0, color: "#f8fbff" },
        { offset: 0.32, color: "#b8c4d1" },
        { offset: 0.66, color: "#75889f" },
        { offset: 1, color: "#e3ebf3" }
      ],
      labelFill: "#16202c",
      topEdge: "#a6b2c0",
      sideEdge: "#435164",
      swatch: ["#f8fbff", "#647385"]
    }
  }
} satisfies Record<string, SquirclePalette>;

export type SquirclePaletteId = keyof typeof SQUIRCLE_PALETTES;

export const SQUIRCLE_PALETTE_IDS = Object.keys(SQUIRCLE_PALETTES) as SquirclePaletteId[];
export const DEFAULT_PALETTE_ID: SquirclePaletteId = "15";

export function getSquirclePalette(paletteId: string | undefined): SquirclePalette {
  return SQUIRCLE_PALETTES[paletteId as SquirclePaletteId] ?? SQUIRCLE_PALETTES[DEFAULT_PALETTE_ID];
}

export function isSquirclePaletteId(paletteId: string | undefined): paletteId is SquirclePaletteId {
  return Boolean(paletteId && paletteId in SQUIRCLE_PALETTES);
}

export function getSquirclePaletteSwatch(paletteId: string | undefined, theme: "light" | "dark" = "light"): [string, string] {
  const palette = getSquirclePalette(paletteId);
  if (theme === "dark") return palette.dark?.swatch ?? palette.swatch;
  return palette.swatch;
}
