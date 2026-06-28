import { useEffect, useId, useMemo, useState } from "react";
import type { CSSProperties, SVGProps } from "react";
import { createSquircleGeometry, pointsToString } from "./geometry";
import {
  DEFAULT_PALETTE_ID,
  getSquirclePalette,
  isSquirclePaletteId,
  SQUIRCLE_PALETTES
} from "./palettes";
import type { SquircleGradientStop } from "./palettes";
import type {
  SquircleAnnotationColor,
  SquircleGeometryConfig,
  SquircleLayerConfig,
  SquircleLayerGeometryConfig,
  SquircleMaterial,
  SquircleOpacityConfig,
  SquircleSceneProps,
  SquircleStrokeConfig,
  SquircleEffect,
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
const DEFAULT_EFFECT: SquircleEffect = "off";

const FLUID_BASE_BLOBS = [
  { x: -1.12, y: -1.04, r: 0.48, slot: 0, i: 0, sp: 0.95, ax: 0.23, ay: 0.21, ar: 0.018 },
  { x: -0.58, y: -0.7, r: 0.49, slot: 1, i: 1, sp: 1.1, ax: 0.24, ay: 0.2, ar: 0.018 },
  { x: -0.1, y: -0.16, r: 0.47, slot: 2, i: 2, sp: 0.9, ax: 0.22, ay: 0.23, ar: 0.016 },
  { x: 0.46, y: -0.72, r: 0.48, slot: 3, i: 3, sp: 1.2, ax: 0.23, ay: 0.21, ar: 0.018 },
  { x: 1.02, y: -0.18, r: 0.46, slot: 4, i: 4, sp: 1.05, ax: 0.22, ay: 0.23, ar: 0.016 },
  { x: 1.18, y: 0.58, r: 0.48, slot: 2, i: 5, sp: 0.85, ax: 0.24, ay: 0.21, ar: 0.018 },
  { x: 0.42, y: 1.08, r: 0.47, slot: 1, i: 6, sp: 1.3, ax: 0.23, ay: 0.24, ar: 0.016 },
  { x: -0.54, y: 1.14, r: 0.48, slot: 3, i: 7, sp: 1.0, ax: 0.24, ay: 0.22, ar: 0.018 }
];

const FLUID_LIGHT_BLOBS = [
  { x: -0.82, y: -0.44, r: 0.48, slot: 0, i: 8, sp: 1.7, ax: 0.25, ay: 0.23, ar: 0.016 },
  { x: -0.2, y: -1.08, r: 0.47, slot: 1, i: 9, sp: 1.45, ax: 0.24, ay: 0.22, ar: 0.016 },
  { x: 0.66, y: 0.0, r: 0.49, slot: 0, i: 10, sp: 2.0, ax: 0.23, ay: 0.25, ar: 0.016 },
  { x: 1.12, y: 0.94, r: 0.47, slot: 1, i: 11, sp: 1.6, ax: 0.25, ay: 0.23, ar: 0.016 }
];

const FROSTED_BLOBS = [
  { x: -1.08, y: -0.96, r: 0.47, slot: 0, i: 12, sp: 0.75, ax: 0.2, ay: 0.19, ar: 0.016 },
  { x: -0.56, y: -0.46, r: 0.49, slot: 1, i: 13, sp: 0.9, ax: 0.21, ay: 0.2, ar: 0.016 },
  { x: 0.02, y: 0.02, r: 0.47, slot: 2, i: 14, sp: 0.8, ax: 0.2, ay: 0.21, ar: 0.016 },
  { x: 0.64, y: -0.6, r: 0.48, slot: 3, i: 15, sp: 1.0, ax: 0.21, ay: 0.19, ar: 0.016 },
  { x: 1.12, y: 0.2, r: 0.46, slot: 1, i: 16, sp: 0.85, ax: 0.2, ay: 0.21, ar: 0.016 },
  { x: 0.74, y: 1.08, r: 0.49, slot: 2, i: 17, sp: 0.95, ax: 0.21, ay: 0.2, ar: 0.016 },
  { x: -0.14, y: 1.16, r: 0.47, slot: 0, i: 18, sp: 0.82, ax: 0.2, ay: 0.21, ar: 0.016 },
  { x: -1.04, y: 0.58, r: 0.48, slot: 3, i: 19, sp: 1.05, ax: 0.21, ay: 0.2, ar: 0.016 }
];

type ResolvedVariant = {
  material: SquircleMaterial;
  paletteId: string;
  effect: SquircleEffect;
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

type EffectColorSet = readonly [string, string, string, string, string, string, string];

type RenderPalette = {
  id: string;
  labelFill: string;
  topEdge: string;
  sideEdge: string;
  top: SquircleGradientStop[];
  side: SquircleGradientStop[];
  textWire: SquircleGradientStop[];
  effectColors: EffectColorSet;
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
  const visibleLayers = useMemo(() => layers.filter((layer) => layer.visible !== false), [layers]);
  const layerGeometryKey = JSON.stringify(visibleLayers.map((layer) => ({
    id: layer.id,
    geometry: layer.geometry,
    offset: layer.offset
  })));
  const layerExtent = useMemo(() => Math.max(
    0,
    ...visibleLayers.map((layer) => {
      const layerGeometry = createLayerGeometry(geometry, undefined, layer.geometry);
      return (layer.offset?.y ?? 0) + layerGeometry.sideBounds.maxY;
    })
  ), [geometryKey, layerGeometryKey, visibleLayers]);
  const viewBoxHeight = geometry?.viewBoxHeight ?? (fitToLayers ? Math.max(baseGeometry.config.viewBoxHeight, layerExtent + 18) : baseGeometry.config.viewBoxHeight);
  const sceneGeometry = useMemo(() => (geometry?.viewBoxHeight === viewBoxHeight
    ? baseGeometry
    : createSquircleGeometry({ ...geometry, viewBoxHeight })), [baseGeometry, geometry, viewBoxHeight]);
  const layerModels = useMemo(() => visibleLayers.map((layer, index) => {
    const layerPrefix = `${prefix}-${index}-${safeIdPart(layer.id)}`;
    const layerGeometry = layer.geometry
      ? createLayerGeometry(geometry, viewBoxHeight, layer.geometry)
      : sceneGeometry;

    return { layer, prefix: layerPrefix, geometry: layerGeometry };
  }), [geometry, prefix, sceneGeometry, viewBoxHeight, visibleLayers]);
  const svgStyle = { "--sq-transition-ms": `${transitionMs}ms` } as CSSProperties;
  const motionEnabled = visibleLayers.some(layerHasAnimatedSurface);
  const motionTime = useMotionTime(motionEnabled);

  return (
    <svg
      className={["squircle-scene", `sq-theme-${theme}`, className].filter(Boolean).join(" ")}
      data-theme={theme}
      viewBox={sceneGeometry.viewBox}
      role="img"
      aria-label={ariaLabel}
      style={svgStyle}
    >
      {layerModels.map((model) => (
        <SquircleDefinitions key={`${model.prefix}-defs`} prefix={model.prefix} geometry={model.geometry} />
      ))}
      {layerModels.map(({ layer, prefix: layerPrefix, geometry: layerGeometry }) => (
        <SquircleLayer
          key={layer.id}
          layer={layer}
          geometry={layerGeometry}
          prefix={layerPrefix}
          motionTime={motionTime}
          selected={selectedLayerId === layer.id}
          onSelect={onLayerSelect}
        />
      ))}
    </svg>
  );
}

function createLayerGeometry(
  sceneGeometry: SquircleGeometryConfig | undefined,
  viewBoxHeight: number | undefined,
  layerGeometry: SquircleLayerGeometryConfig | undefined
) {
  return createSquircleGeometry({
    ...sceneGeometry,
    ...(viewBoxHeight === undefined ? {} : { viewBoxHeight }),
    ...layerGeometry
  });
}

function safeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-") || "layer";
}

function SquircleDefinitions({ prefix, geometry }: { prefix: string; geometry: ReturnType<typeof createSquircleGeometry> }) {
  const topPoints = pointsToString(geometry.topPoints);
  const planeWidth = geometry.config.halfSize * 2;
  const planeBlur = roundNumber(planeWidth * 0.13);
  const filterExtent = roundNumber(geometry.config.halfSize * 3.6);
  const filterSize = filterExtent * 2;

  return (
    <defs>
      <clipPath id={`${prefix}-top-clip`} clipPathUnits="userSpaceOnUse">
        <polygon points={topPoints} />
      </clipPath>
      <filter
        id={`${prefix}-fluid-main-blur`}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        x={-filterExtent}
        y={-filterExtent}
        width={filterSize}
        height={filterSize}
      >
        <feGaussianBlur stdDeviation={planeBlur} />
      </filter>
      <filter
        id={`${prefix}-fluid-light-blur`}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        x={-filterExtent}
        y={-filterExtent}
        width={filterSize}
        height={filterSize}
      >
        <feGaussianBlur stdDeviation={planeBlur} />
      </filter>
      <filter
        id={`${prefix}-frosted-blur`}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        x={-filterExtent}
        y={-filterExtent}
        width={filterSize}
        height={filterSize}
      >
        <feGaussianBlur stdDeviation={planeBlur} />
      </filter>
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
  motionTime,
  selected,
  onSelect
}: {
  layer: SquircleLayerConfig;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionTime: number;
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
      <SquircleVariant className="sq-base" variant={base} geometry={geometry} prefix={prefix} motionTime={motionTime} />
      {hasHover && hover ? <SquircleVariant className="sq-hover" variant={hover} geometry={geometry} prefix={prefix} motionTime={motionTime} /> : null}
    </g>
  );
}

function SquircleVariant({
  className,
  variant,
  geometry,
  prefix,
  motionTime
}: {
  className: string;
  variant: ResolvedVariant;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionTime: number;
}) {
  const palette = getRenderPalette(variant.paletteId);
  const topFill = `url(#${prefix}-top-${palette.id})`;
  const sideFill = `url(#${prefix}-side-${palette.id})`;
  const textSurfaceFill = `url(#${prefix}-text-surface-${palette.id})`;
  const textWireFill = `url(#${prefix}-text-wire-${palette.id})`;
  const wallPoints = pointsToString(geometry.wallPoints);
  const topPoints = pointsToString(geometry.topPoints);
  const hiddenPoints = pointsToString(geometry.hiddenPoints);
  const inlayPoints = pointsToString(geometry.inlayPoints);
  const topClipId = `${prefix}-top-clip`;

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
          <SolidTopFace
            variant={variant}
            palette={palette}
            geometry={geometry}
            prefix={prefix}
            topClipId={topClipId}
            topFill={topFill}
            topPoints={topPoints}
            motionTime={motionTime}
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

function SolidTopFace({
  variant,
  palette,
  geometry,
  prefix,
  topClipId,
  topFill,
  topPoints,
  motionTime
}: {
  variant: ResolvedVariant;
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  topClipId: string;
  topFill: string;
  topPoints: string;
  motionTime: number;
}) {
  const fillOpacity = variant.material === "transparent" ? variant.opacity.transparentFace : 1;
  const effect = variant.material === "solid" ? variant.effect : "off";
  const halfSize = geometry.config.halfSize;
  const baseRect = {
    x: -halfSize * 1.3,
    y: -halfSize * 1.3,
    size: halfSize * 2.6
  };

  if (effect === "fluid") {
    return (
      <>
        <g className="sq-top-effect sq-top-effect-fluid" clipPath={`url(#${topClipId})`}>
          <g transform={geometry.labelTransform}>
            <rect
              x={baseRect.x}
              y={baseRect.y}
              width={baseRect.size}
              height={baseRect.size}
              fill={palette.effectColors[3]}
            />
            <g filter={`url(#${prefix}-fluid-main-blur)`}>
              {FLUID_BASE_BLOBS.map((blob) => (
                <MotionBlob key={blob.i} blob={blob} palette={palette} geometry={geometry} motionTime={motionTime} />
              ))}
            </g>
            <g filter={`url(#${prefix}-fluid-light-blur)`} opacity={0.6} style={{ mixBlendMode: "screen" }}>
              {FLUID_LIGHT_BLOBS.map((blob) => (
                <MotionBlob key={blob.i} blob={blob} palette={palette} geometry={geometry} motionTime={motionTime} />
              ))}
            </g>
          </g>
        </g>
        <polygon
          className="sq-face sq-solid-top sq-effect-outline"
          points={topPoints}
          fill="none"
          stroke={palette.topEdge}
          strokeWidth={variant.stroke.face}
          strokeOpacity={variant.stroke.faceOpacity}
        />
      </>
    );
  }

  if (effect === "frosted") {
    return (
      <>
        <g className="sq-top-effect sq-top-effect-frosted" clipPath={`url(#${topClipId})`}>
          <g transform={geometry.labelTransform}>
            <rect
              x={baseRect.x}
              y={baseRect.y}
              width={baseRect.size}
              height={baseRect.size}
              fill={palette.effectColors[6]}
            />
            <g filter={`url(#${prefix}-frosted-blur)`}>
              {FROSTED_BLOBS.map((blob) => (
                <MotionBlob key={blob.i} blob={blob} palette={palette} geometry={geometry} motionTime={motionTime} />
              ))}
            </g>
          </g>
          <polygon points={topPoints} fill="#eef2ff" opacity={0.16} />
        </g>
        <polygon
          className="sq-face sq-solid-top sq-effect-outline"
          points={topPoints}
          fill="none"
          stroke={palette.topEdge}
          strokeWidth={variant.stroke.face}
          strokeOpacity={variant.stroke.faceOpacity}
        />
        <polygon
          className="sq-face sq-frosted-rim"
          points={topPoints}
          fill="none"
          stroke="#ffffff"
          strokeWidth={Math.max(0.7, variant.stroke.face * 1.8)}
          strokeOpacity={0.52}
        />
      </>
    );
  }

  return (
    <polygon
      className="sq-face sq-solid-top"
      points={topPoints}
      fill={topFill}
      fillOpacity={fillOpacity}
      stroke={palette.topEdge}
      strokeWidth={variant.stroke.face}
      strokeOpacity={variant.stroke.faceOpacity}
    />
  );
}

function MotionBlob({
  blob,
  palette,
  geometry,
  motionTime
}: {
  blob: {
    x: number;
    y: number;
    r: number;
    slot: number;
    i: number;
    sp: number;
    ax: number;
    ay: number;
    ar: number;
  };
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  motionTime: number;
}) {
  const halfSize = geometry.config.halfSize;
  const planeWidth = halfSize * 2;
  const x = halfSize * blob.x;
  const y = halfSize * blob.y;
  const radius = planeWidth * blob.r;
  const ax = planeWidth * blob.ax;
  const ay = planeWidth * blob.ay;
  const ar = planeWidth * blob.ar;
  const cx = x + ax * Math.sin(motionTime * 0.62 * blob.sp + blob.i * 1.7) + 0.5 * ax * Math.cos(motionTime * 0.4 * blob.sp + blob.i * 0.6);
  const cy = y + ay * Math.cos(motionTime * 0.55 * blob.sp + blob.i * 2.1) + 0.55 * ay * Math.sin(motionTime * 0.34 * blob.sp + blob.i);
  const r = Math.max(4, radius + ar * Math.sin(motionTime * 0.8 + blob.i * 1.2));

  return (
    <circle
      cx={roundNumber(cx)}
      cy={roundNumber(cy)}
      r={roundNumber(r)}
      fill={palette.effectColors[blob.slot] ?? palette.effectColors[3]}
    />
  );
}

function resolveVariant(
  variant: SquircleVariantConfig,
  layerStroke: Partial<SquircleStrokeConfig> = {},
  layerOpacity: Partial<SquircleOpacityConfig> = {}
): ResolvedVariant {
  return {
    material: variant.material ?? "wireframe",
    paletteId: resolvePaletteId(variant.paletteId),
    effect: normalizeEffect(variant.effect ?? DEFAULT_EFFECT),
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

function normalizeEffect(effect: SquircleEffect | string): SquircleEffect {
  if (effect === "fluid" || effect === "frosted") return effect;
  return "off";
}

function resolvePaletteId(paletteId: string | undefined): string {
  return isSquirclePaletteId(paletteId) ? paletteId : DEFAULT_PALETTE_ID;
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

function dashPaint(variant: ResolvedVariant, palette: RenderPalette, topFill: string): string {
  if (variant.material === "wireframe") return topFill;
  return annotationPaint(variant.dashColor, palette.labelFill);
}

function annotationOpacity(variant: ResolvedVariant): number {
  if (variant.material === "transparent") return variant.opacity.transparentAnnotation;
  return variant.opacity.solidAnnotation;
}

function textPaintProps(
  variant: ResolvedVariant,
  palette: RenderPalette,
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

function useMotionTime(enabled: boolean): number {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setTime(0);
      return undefined;
    }

    const update = () => setTime(performance.now() / 1000);
    update();
    const interval = window.setInterval(update, 33);

    return () => window.clearInterval(interval);
  }, [enabled]);

  return enabled ? time : 0;
}

function layerHasAnimatedSurface(layer: SquircleLayerConfig): boolean {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  if (variantHasAnimatedSurface(base)) return true;
  if (!layer.hover) return false;
  const hover = resolveVariant({ ...layer.base, ...layer.hover }, layer.stroke, layer.opacity);
  return variantHasAnimatedSurface(hover);
}

function variantHasAnimatedSurface(variant: ResolvedVariant): boolean {
  return variant.material === "solid" && variant.effect !== "off";
}

function getRenderPalette(paletteId: string): RenderPalette {
  const palette = getSquirclePalette(paletteId);

  return {
    id: palette.id,
    labelFill: palette.labelFill,
    topEdge: palette.topEdge,
    sideEdge: palette.sideEdge,
    top: palette.top,
    side: palette.side,
    textWire: palette.textWire,
    effectColors: alphaPaletteEffectColors(palette)
  };
}

function alphaPaletteEffectColors(palette: ReturnType<typeof getSquirclePalette>): EffectColorSet {
  const topStart = palette.top[0]?.color ?? "#f5f0ff";
  const topMid = palette.top[Math.floor(palette.top.length / 2)]?.color ?? topStart;
  const topEnd = palette.top.at(-1)?.color ?? topMid;
  const sideStart = palette.side[0]?.color ?? topMid;
  const sideMid = palette.side[Math.floor(palette.side.length / 2)]?.color ?? sideStart;
  const sideEnd = palette.side.at(-1)?.color ?? palette.sideEdge;

  return [topStart, topStart, topMid, topEnd, sideStart, sideMid, sideEnd];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(1));
}
