import type { SquircleEffect, SquircleLayerConfig, SquircleLineStyle, SquircleMaterial, SquircleTheme, SquircleVariantConfig } from "../squircle";
import { SQUIRCLE_PALETTE_IDS, reflowLayerOffsets } from "../squircle";

export const PAGE_LAYER_GAP = 88;
export const PAGE_PALETTES = SQUIRCLE_PALETTE_IDS;

const materials: SquircleMaterial[] = ["wireframe", "solid", "transparent"];
const effects = ["off", "metal"] as const satisfies readonly SquircleEffect[];
const labels = ["GPU", "CUDA", "AI", "{}"];

export interface CompositionPreset {
  id: string;
  name: string;
  note: string;
  layers: SquircleLayerConfig[];
}

export function createHeroLayers(paletteId = "15"): SquircleLayerConfig[] {
  return reflowLayerOffsets([
    {
      id: "bottom",
      base: { material: "solid", paletteId, line: "dashed" },
      hover: { material: "wireframe", paletteId: "20", line: "dashed" }
    },
    {
      id: "middle",
      base: { material: "transparent", paletteId: "18" },
      hover: { material: "solid", paletteId }
    },
    {
      id: "top",
      base: { material: "wireframe", paletteId, text: "GPU", textStyle: "wireframe" },
      hover: { material: "solid", paletteId, text: "GPU", textStyle: "solid", line: "dashed" }
    }
  ], PAGE_LAYER_GAP);
}

export function createSingleStatePresets(paletteId: string): CompositionPreset[] {
  const baseStates: SquircleVariantConfig[] = [
    { material: "solid", paletteId },
    { material: "solid", paletteId, text: "GPU", textStyle: "solid" },
    { material: "solid", paletteId, text: "GPU", textStyle: "wireframe" },
    { material: "solid", paletteId, line: "solid" },
    { material: "solid", paletteId, text: "GPU", textStyle: "solid", line: "dotted" },
    { material: "solid", paletteId, effect: "metal", text: "GPU", textStyle: "solid", line: "dashed" },
    { material: "transparent", paletteId },
    { material: "transparent", paletteId, text: "GPU", textStyle: "solid" },
    { material: "transparent", paletteId, text: "GPU", textStyle: "wireframe", line: "dotted" },
    { material: "transparent", paletteId, effect: "metal", text: "AI", textStyle: "solid", line: "dashed" },
    { material: "wireframe", paletteId },
    { material: "wireframe", paletteId, text: "GPU", textStyle: "solid" },
    { material: "wireframe", paletteId, text: "GPU", textStyle: "wireframe" },
    { material: "wireframe", paletteId, text: "GPU", textStyle: "wireframe", line: "dashed" }
  ];

  return baseStates.map((base, index) => ({
    id: `single-${index + 1}`,
    name: singleName(base),
    note: singleNote(base),
    layers: [
      {
        id: "single",
        base,
        hover: hoverFor(base, index)
      }
    ]
  }));
}

export function createCompositionPresets(paletteId: string, count = 96): CompositionPreset[] {
  const startPaletteIndex = Math.max(0, PAGE_PALETTES.findIndex((id) => id === paletteId));
  return Array.from({ length: count }, (_, index) => {
    const palette = PAGE_PALETTES[(startPaletteIndex + index) % PAGE_PALETTES.length] ?? paletteId;
    const nextPalette = PAGE_PALETTES[(index + 3) % PAGE_PALETTES.length] ?? paletteId;
    const bottom = createVariant(index, palette, 0);
    const middle = createVariant(index + 5, palette, 1);
    const top = createVariant(index + 11, palette, 2);
    const layers = reflowLayerOffsets([
      {
        id: "bottom",
        base: bottom,
        hover: hoverFor(bottom, index + 1, nextPalette)
      },
      {
        id: "middle",
        base: middle,
        hover: hoverFor(middle, index + 2, nextPalette)
      },
      {
        id: "top",
        base: top,
        hover: hoverFor(top, index + 3, nextPalette)
      }
    ], PAGE_LAYER_GAP);

    return {
      id: `composition-${index + 1}`,
      name: `Variant ${String(index + 1).padStart(2, "0")}`,
      note: `${summary(bottom)} / ${summary(middle)} / ${summary(top)}`,
      layers
    };
  });
}

export function createEditorSeed(paletteId = "15"): SquircleLayerConfig[] {
  return reflowLayerOffsets([
    {
      id: "layer-1",
      visible: true,
      base: { material: "wireframe", paletteId },
      hover: undefined
    },
    {
      id: "layer-2",
      visible: true,
      base: { material: "wireframe", paletteId },
      hover: undefined
    },
    {
      id: "layer-3",
      visible: true,
      base: { material: "wireframe", paletteId },
      hover: undefined
    }
  ], PAGE_LAYER_GAP);
}

export function pageThemeClass(theme: SquircleTheme): string {
  return theme === "dark" ? "sq-page sq-page-dark" : "sq-page";
}

function createVariant(index: number, paletteId: string, layerIndex: number): SquircleVariantConfig {
  const material = materials[(index + layerIndex) % materials.length] ?? "wireframe";
  const withText = (index + layerIndex) % 4 === 0 || layerIndex === 2;
  const line = lineFor(index, layerIndex);
  const textStyle = material === "wireframe" || index % 2 === 0 ? "wireframe" : "solid";

  return {
    material,
    paletteId,
    effect: materialSupportsEffect(material) ? effects[index % effects.length] : undefined,
    text: withText ? labels[(index + layerIndex) % labels.length] : false,
    textStyle,
    line
  };
}

function hoverFor(base: SquircleVariantConfig, index: number, paletteId = base.paletteId ?? "15"): SquircleVariantConfig {
  const material = base.material === "wireframe" ? "solid" : "wireframe";

  return {
    ...base,
    material,
    paletteId,
    effect: materialSupportsEffect(material) ? effects[index % effects.length] : undefined,
    textStyle: base.textStyle === "wireframe" ? "solid" : "wireframe"
  };
}

function singleName(base: SquircleVariantConfig): string {
  const pieces: string[] = [base.material ?? "wireframe"];
  if (base.effect && base.effect !== "off") pieces.push(base.effect);
  if (base.text) pieces.push("text");
  if (base.line) pieces.push(`${base.line} line`);
  if (base.textStyle === "wireframe") pieces.push("outlined");
  return titleCase(pieces.join(" + "));
}

function singleNote(base: SquircleVariantConfig): string {
  const effect = base.effect && base.effect !== "off" ? ` / ${base.effect}` : "";
  const text = base.text ? `text ${base.textStyle ?? "solid"}` : "no text";
  const line = base.line ? `${base.line} line` : "no line";
  return `${base.material ?? "wireframe"}${effect} / ${text} / ${line}`;
}

function summary(base: SquircleVariantConfig): string {
  const parts: string[] = [base.material ?? "wireframe"];
  if (base.effect && base.effect !== "off") parts.push(base.effect);
  if (base.text) parts.push("text");
  if (base.line) parts.push(`${base.line}-line`);
  return parts.join("+");
}

function lineFor(index: number, layerIndex: number): SquircleLineStyle | false {
  const styles: (SquircleLineStyle | false)[] = [false, "solid", "dotted", "dashed"];
  return styles[(index + layerIndex) % styles.length] ?? false;
}

function materialSupportsEffect(material: SquircleMaterial | undefined): boolean {
  return material === "solid" || material === "transparent";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
