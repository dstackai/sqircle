import { useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { createSquircleGeometry, pointsToString } from "./geometry";
import { getSquirclePalette, SQUIRCLE_PALETTES } from "./palettes";
import type {
  SquircleAnnotationColor,
  SquircleGeometryConfig,
  SquircleLayerConfig,
  SquircleMaterial,
  SquircleOpacityConfig,
  SquircleSceneProps,
  SquircleStrokeConfig,
  SquircleTextStyle,
  SquircleVariantConfig
} from "./types";
import "./SquircleScene.css";

const DEFAULT_STROKES: SquircleStrokeConfig = {
  face: 0.35,
  faceOpacity: 0.72,
  wire: 1.6,
  wireOpacity: 0.88,
  hidden: 1.2,
  hiddenOpacity: 0.28,
  dash: 2.2,
  wireDash: 1.6,
  labelWire: 1.1
};

const DEFAULT_OPACITY: SquircleOpacityConfig = {
  transparentFace: 0.38,
  transparentAnnotation: 0.62,
  solidAnnotation: 0.88
};

const DEFAULT_TEXT = "GPU";
const DEFAULT_TEXT_SIZE = 62;
const DEFAULT_TEXT_FONT_FAMILY = "Arial, Helvetica, sans-serif";
const DEFAULT_TEXT_FONT_WEIGHT = 400;

type ResolvedVariant = {
  material: SquircleMaterial;
  paletteId: string;
  text: string | null;
  dash: boolean;
  textStyle: SquircleTextStyle;
  textColor: Exclude<SquircleAnnotationColor, "auto">;
  textSize: number;
  textFontFamily: string;
  textFontWeight: string | number;
  dashColor: Exclude<SquircleAnnotationColor, "auto">;
  stroke: SquircleStrokeConfig;
  opacity: SquircleOpacityConfig;
};

interface LegacyTextVariantConfig {
  gpu?: boolean;
  gpuStyle?: SquircleTextStyle | string;
  gpuColor?: SquircleAnnotationColor;
}

export function SquircleScene({
  layers,
  geometry,
  selectedLayerId,
  theme = "light",
  idPrefix,
  className,
  ariaLabel = "Squircle scene",
  fitToLayers = true,
  transitionMs = 220,
  onLayerSelect
}: SquircleSceneProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const prefix = idPrefix ?? `sq-${reactId}`;
  const geometryKey = JSON.stringify(geometry ?? {});
  const baseGeometry = useMemo(() => createSquircleGeometry(geometry), [geometryKey]);
  const visibleLayers = layers.filter((layer) => layer.visible !== false);
  const maxLayerY = Math.max(0, ...visibleLayers.map((layer) => layer.offset?.y ?? 0));
  const viewBoxHeight = geometry?.viewBoxHeight ?? (fitToLayers ? Math.max(baseGeometry.config.viewBoxHeight, maxLayerY + baseGeometry.sideBounds.maxY + 18) : baseGeometry.config.viewBoxHeight);
  const sceneGeometry = geometry?.viewBoxHeight === viewBoxHeight
    ? baseGeometry
    : createSquircleGeometry({ ...geometry, viewBoxHeight });
  const svgStyle = { "--sq-transition-ms": `${transitionMs}ms` } as CSSProperties;

  return (
    <svg
      className={["squircle-scene", `sq-theme-${theme}`, className].filter(Boolean).join(" ")}
      data-theme={theme}
      viewBox={sceneGeometry.viewBox}
      role="img"
      aria-label={ariaLabel}
      style={svgStyle}
    >
      <SquircleDefinitions prefix={prefix} geometry={sceneGeometry} />
      {visibleLayers.map((layer) => (
        <SquircleLayer
          key={layer.id}
          layer={layer}
          geometry={sceneGeometry}
          prefix={prefix}
          selected={selectedLayerId === layer.id}
          onSelect={onLayerSelect}
        />
      ))}
    </svg>
  );
}

function SquircleDefinitions({ prefix, geometry }: { prefix: string; geometry: ReturnType<typeof createSquircleGeometry> }) {
  return (
    <defs>
      {Object.values(SQUIRCLE_PALETTES).map((palette) => (
        <g key={palette.id}>
          <LinearGradient
            id={`${prefix}-top-${palette.id}`}
            x1={geometry.topBounds.minX}
            y1={geometry.topBounds.minY}
            x2={geometry.topBounds.maxX}
            y2={geometry.topBounds.maxY}
            stops={palette.top}
          />
          <LinearGradient
            id={`${prefix}-side-${palette.id}`}
            x1={geometry.sideBounds.minX}
            y1={geometry.sideBounds.minY}
            x2={geometry.sideBounds.maxX}
            y2={geometry.sideBounds.maxY}
            stops={palette.side}
          />
          <LinearGradient
            id={`${prefix}-text-surface-${palette.id}`}
            x1={-425.63}
            y1={-0.1}
            x2={425.6}
            y2={0.07}
            stops={palette.top}
          />
          <LinearGradient
            id={`${prefix}-text-wire-${palette.id}`}
            x1={-64}
            y1={-24}
            x2={64}
            y2={24}
            stops={palette.textWire}
          />
        </g>
      ))}
    </defs>
  );
}

function LinearGradient({
  id,
  x1,
  y1,
  x2,
  y2,
  stops
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: string }[];
}) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
      {stops.map((stop) => (
        <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
      ))}
    </linearGradient>
  );
}

function SquircleLayer({
  layer,
  geometry,
  prefix,
  selected,
  onSelect
}: {
  layer: SquircleLayerConfig;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  selected: boolean;
  onSelect?: (layerId: string) => void;
}) {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  const hover = layer.hover ? resolveVariant({ ...layer.base, ...layer.hover }, layer.stroke, layer.opacity) : null;
  const hasHover = Boolean(hover && variantSignature(hover) !== variantSignature(base));
  const x = layer.offset?.x ?? 0;
  const y = layer.offset?.y ?? 0;

  return (
    <g
      className={[
        "sq-layer",
        hasHover ? "sq-has-hover" : "",
        selected ? "is-selected" : "",
        layer.className
      ].filter(Boolean).join(" ")}
      data-layer-id={layer.id}
      data-hover-enabled={String(hasHover)}
      transform={`translate(${x} ${y})`}
      onClick={onSelect ? () => onSelect(layer.id) : undefined}
    >
      <SquircleVariant className="sq-base" variant={base} geometry={geometry} prefix={prefix} />
      {hasHover && hover ? <SquircleVariant className="sq-hover" variant={hover} geometry={geometry} prefix={prefix} /> : null}
    </g>
  );
}

function SquircleVariant({
  className,
  variant,
  geometry,
  prefix
}: {
  className: string;
  variant: ResolvedVariant;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
}) {
  const palette = getSquirclePalette(variant.paletteId);
  const topFill = `url(#${prefix}-top-${palette.id})`;
  const sideFill = `url(#${prefix}-side-${palette.id})`;
  const textSurfaceFill = `url(#${prefix}-text-surface-${palette.id})`;
  const textWireFill = `url(#${prefix}-text-wire-${palette.id})`;
  const wallPoints = pointsToString(geometry.wallPoints);
  const topPoints = pointsToString(geometry.topPoints);
  const hiddenPoints = pointsToString(geometry.hiddenPoints);
  const inlayPoints = pointsToString(geometry.inlayPoints);

  return (
    <g className={["sq-variant", className, `sq-material-${variant.material}`].join(" ")}>
      {variant.material === "wireframe" ? (
        <>
          <polyline
            className="sq-hidden"
            points={hiddenPoints}
            stroke={topFill}
            strokeWidth={variant.stroke.hidden}
            opacity={variant.stroke.hiddenOpacity}
          />
          <polygon
            className="sq-face sq-wire-side"
            points={wallPoints}
            fill="none"
            stroke={topFill}
            strokeWidth={variant.stroke.wire}
            strokeOpacity={variant.stroke.wireOpacity}
          />
          <polygon
            className="sq-face sq-wire-top"
            points={topPoints}
            fill="none"
            stroke={topFill}
            strokeWidth={variant.stroke.wire}
            strokeOpacity={variant.stroke.wireOpacity}
          />
        </>
      ) : (
        <>
          <polygon
            className="sq-face sq-solid-side"
            points={wallPoints}
            fill={sideFill}
            fillOpacity={variant.material === "transparent" ? variant.opacity.transparentFace : 1}
            stroke={palette.sideEdge}
            strokeWidth={variant.stroke.face}
            strokeOpacity={variant.stroke.faceOpacity}
          />
          <polygon
            className="sq-face sq-solid-top"
            points={topPoints}
            fill={topFill}
            fillOpacity={variant.material === "transparent" ? variant.opacity.transparentFace : 1}
            stroke={palette.topEdge}
            strokeWidth={variant.stroke.face}
            strokeOpacity={variant.stroke.faceOpacity}
          />
        </>
      )}
      {variant.dash ? (
        <polygon
          className="sq-inlay"
          points={inlayPoints}
          stroke={dashPaint(variant, palette, topFill)}
          strokeWidth={variant.material === "wireframe" ? variant.stroke.wireDash : variant.stroke.dash}
          opacity={annotationOpacity(variant)}
        />
      ) : null}
      {variant.text ? (
        <text
          className="sq-label"
          transform={geometry.labelTransform}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={variant.textFontFamily}
          fontSize={variant.textSize}
          fontWeight={variant.textFontWeight}
          {...textPaintProps(variant, palette, textSurfaceFill, textWireFill)}
        >
          {variant.text}
        </text>
      ) : null}
    </g>
  );
}

function resolveVariant(
  variant: SquircleVariantConfig,
  layerStroke: Partial<SquircleStrokeConfig> = {},
  layerOpacity: Partial<SquircleOpacityConfig> = {}
): ResolvedVariant {
  return {
    material: variant.material ?? "wireframe",
    paletteId: variant.paletteId ?? "15",
    text: normalizeTextValue(variant.text, legacyVariant(variant).gpu),
    dash: variant.dash ?? false,
    textStyle: normalizeTextStyle(variant.textStyle ?? legacyVariant(variant).gpuStyle ?? "solid"),
    textColor: normalizeAnnotationColor(variant.textColor ?? legacyVariant(variant).gpuColor ?? "contrast"),
    textSize: variant.textSize ?? DEFAULT_TEXT_SIZE,
    textFontFamily: variant.textFontFamily ?? DEFAULT_TEXT_FONT_FAMILY,
    textFontWeight: variant.textFontWeight ?? DEFAULT_TEXT_FONT_WEIGHT,
    dashColor: normalizeAnnotationColor(variant.dashColor ?? "contrast"),
    stroke: { ...DEFAULT_STROKES, ...layerStroke, ...variant.stroke },
    opacity: { ...DEFAULT_OPACITY, ...layerOpacity, ...variant.opacity }
  };
}

function legacyVariant(variant: SquircleVariantConfig): LegacyTextVariantConfig {
  return variant as SquircleVariantConfig & LegacyTextVariantConfig;
}

function normalizeTextValue(value: SquircleVariantConfig["text"], legacyGpu: boolean | undefined): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (value === true || legacyGpu) return DEFAULT_TEXT;
  return null;
}

function normalizeTextStyle(style: SquircleTextStyle | string): SquircleTextStyle {
  return style === "wireframe" ? "wireframe" : "solid";
}

function normalizeAnnotationColor(color: SquircleAnnotationColor): Exclude<SquircleAnnotationColor, "auto"> {
  return color === "auto" ? "contrast" : color;
}

function annotationPaint(color: SquircleAnnotationColor, labelFill: string): string {
  const normalized = normalizeAnnotationColor(color);
  if (normalized === "white") return "#ffffff";
  if (normalized === "black") return "#05070a";
  return labelFill;
}

function dashPaint(variant: ResolvedVariant, palette: ReturnType<typeof getSquirclePalette>, topFill: string): string {
  if (variant.material === "wireframe") return topFill;
  return annotationPaint(variant.dashColor, palette.labelFill);
}

function annotationOpacity(variant: ResolvedVariant): number {
  if (variant.material === "transparent") return variant.opacity.transparentAnnotation;
  return variant.opacity.solidAnnotation;
}

function textPaintProps(
  variant: ResolvedVariant,
  palette: ReturnType<typeof getSquirclePalette>,
  textSurfaceFill: string,
  textWireFill: string
): SVGProps<SVGTextElement> {
  const opacity = annotationOpacity(variant);

  if (variant.material === "wireframe") {
    if (variant.textStyle === "wireframe") {
      return {
        fill: "none",
        stroke: textWireFill,
        strokeWidth: variant.stroke.labelWire,
        opacity
      };
    }
    return {
      fill: textSurfaceFill,
      stroke: "none",
      strokeWidth: 0,
      opacity: 1
    };
  }

  if (variant.textStyle === "wireframe") {
    return {
      fill: "none",
      stroke: annotationPaint(variant.textColor, palette.labelFill),
      strokeWidth: variant.stroke.labelWire,
      opacity
    };
  }

  return {
    fill: annotationPaint(variant.textColor, palette.labelFill),
    stroke: "none",
    strokeWidth: 0,
    opacity
  };
}

function variantSignature(variant: ResolvedVariant): string {
  return JSON.stringify(variant);
}
