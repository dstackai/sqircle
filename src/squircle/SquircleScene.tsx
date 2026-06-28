import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SVGProps } from "react";
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
  SquircleLayerClickEvent,
  SquircleLayerConfig,
  SquircleLayerGeometryConfig,
  SquircleLineStyle,
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
  line: 2.2,
  wireLine: 1.6,
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
const MOTION_INTERVAL_MS = 33;
const motionClockSubscribers = new Set<(time: number) => void>();
let motionClockInterval: number | null = null;

const METAL_BASE_BLOBS = [
  { x: -1.12, y: -1.04, r: 0.48, slot: 0, i: 0, sp: 0.95, ax: 0.23, ay: 0.21, ar: 0.018 },
  { x: -0.58, y: -0.7, r: 0.49, slot: 1, i: 1, sp: 1.1, ax: 0.24, ay: 0.2, ar: 0.018 },
  { x: -0.1, y: -0.16, r: 0.47, slot: 2, i: 2, sp: 0.9, ax: 0.22, ay: 0.23, ar: 0.016 },
  { x: 0.46, y: -0.72, r: 0.48, slot: 3, i: 3, sp: 1.2, ax: 0.23, ay: 0.21, ar: 0.018 },
  { x: 1.02, y: -0.18, r: 0.46, slot: 4, i: 4, sp: 1.05, ax: 0.22, ay: 0.23, ar: 0.016 },
  { x: 1.18, y: 0.58, r: 0.48, slot: 2, i: 5, sp: 0.85, ax: 0.24, ay: 0.21, ar: 0.018 },
  { x: 0.42, y: 1.08, r: 0.47, slot: 1, i: 6, sp: 1.3, ax: 0.23, ay: 0.24, ar: 0.016 },
  { x: -0.54, y: 1.14, r: 0.48, slot: 3, i: 7, sp: 1.0, ax: 0.24, ay: 0.22, ar: 0.018 }
];

const METAL_LIGHT_BLOBS = [
  { x: -0.82, y: -0.44, r: 0.48, slot: 0, i: 8, sp: 1.7, ax: 0.25, ay: 0.23, ar: 0.016 },
  { x: -0.2, y: -1.08, r: 0.47, slot: 1, i: 9, sp: 1.45, ax: 0.24, ay: 0.22, ar: 0.016 },
  { x: 0.66, y: 0.0, r: 0.49, slot: 0, i: 10, sp: 2.0, ax: 0.23, ay: 0.25, ar: 0.016 },
  { x: 1.12, y: 0.94, r: 0.47, slot: 1, i: 11, sp: 1.6, ax: 0.25, ay: 0.23, ar: 0.016 }
];

type ResolvedVariant = {
  material: SquircleMaterial;
  paletteId: string;
  effect: SquircleEffect;
  text: string | null;
  line: SquircleLineStyle | null;
  textStyle: SquircleTextStyle;
  textColor: SquircleAnnotationColor;
  textSize: number;
  textFontFamily: string;
  textFontWeight: string | number;
  lineColor: SquircleAnnotationColor;
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
  onLayerClick
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

    return { layer, index, prefix: layerPrefix, geometry: layerGeometry };
  }), [geometry, prefix, sceneGeometry, viewBoxHeight, visibleLayers]);
  const layerEventModels = useMemo(() => new Map(
    layerModels.map(({ layer, index }) => [layer.id, { layer, index }])
  ), [layerModels]);
  const svgStyle = { "--sq-transition-ms": `${transitionMs}ms` } as CSSProperties;
  const hoveredLayerIdRef = useRef<string | null>(null);
  const [resolvedHoverState, setResolvedHoverState] = useState<ResolvedHoverState>({ layerId: null, visible: false });
  const resolvedHoverFrameRef = useRef<number | null>(null);
  const resolvedHoverClearTimerRef = useRef<number | null>(null);
  const hasHoverResolver = layerModels.some(({ layer }) => typeof layer.hover === "function");
  const motionEnabled = layerModels.some(({ layer, index }) => {
    if (layerHasAnimatedSurface(layer)) return true;
    const hover = resolveLayerHover(layer, index, visibleLayers, resolvedHoverState.layerId, resolvedHoverState.visible);
    if (!hover?.enabled) return false;
    const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
    return variantHasAnimatedSurface(hoverVariant);
  });
  const motionTime = useMotionTime(motionEnabled);

  useEffect(() => () => {
    if (resolvedHoverFrameRef.current !== null) {
      window.cancelAnimationFrame(resolvedHoverFrameRef.current);
    }
    if (resolvedHoverClearTimerRef.current !== null) {
      window.clearTimeout(resolvedHoverClearTimerRef.current);
    }
  }, []);

  const handlePointerOver = hasHoverResolver
    ? (event: ReactPointerEvent<SVGSVGElement>) => {
        const layerElement = closestLayerElement(event.target, event.currentTarget);
        const layerId = layerElement?.dataset.layerId;
        if (!layerElement || !layerId || hoveredLayerIdRef.current === layerId) return;

        hoveredLayerIdRef.current = layerId;
        showResolvedHover(layerId);
      }
    : undefined;
  const handlePointerOut = hasHoverResolver
    ? (event: ReactPointerEvent<SVGSVGElement>) => {
        const layerElement = closestLayerElement(event.target, event.currentTarget);
        const layerId = layerElement?.dataset.layerId;
        if (!layerElement || !layerId) return;

        const nextLayerElement = closestLayerElement(event.relatedTarget, event.currentTarget);
        const nextLayerId = nextLayerElement?.dataset.layerId ?? null;
        if (nextLayerId === layerId) return;

        if (!nextLayerId && hoveredLayerIdRef.current === layerId) {
          hoveredLayerIdRef.current = null;
          hideResolvedHover();
        }
      }
    : undefined;
  const handleClick = onLayerClick
    ? (event: ReactMouseEvent<SVGSVGElement>) => {
        const layerElement = closestLayerElement(event.target, event.currentTarget);
        const layerId = layerElement?.dataset.layerId;
        if (!layerElement || !layerId) return;

        const model = layerEventModels.get(layerId);
        if (!model) return;
        onLayerClick?.(createLayerClickEvent(model.layer, model.index, layerElement, event));
      }
    : undefined;

  function clearResolvedHoverTimers() {
    if (resolvedHoverFrameRef.current !== null) {
      window.cancelAnimationFrame(resolvedHoverFrameRef.current);
      resolvedHoverFrameRef.current = null;
    }
    if (resolvedHoverClearTimerRef.current !== null) {
      window.clearTimeout(resolvedHoverClearTimerRef.current);
      resolvedHoverClearTimerRef.current = null;
    }
  }

  function showResolvedHover(layerId: string) {
    clearResolvedHoverTimers();
    setResolvedHoverState({ layerId, visible: false });
    resolvedHoverFrameRef.current = window.requestAnimationFrame(() => {
      resolvedHoverFrameRef.current = null;
      setResolvedHoverState((current) => (
        current.layerId === layerId ? { layerId, visible: true } : current
      ));
    });
  }

  function hideResolvedHover() {
    clearResolvedHoverTimers();
    setResolvedHoverState((current) => (
      current.layerId ? { ...current, visible: false } : current
    ));
    resolvedHoverClearTimerRef.current = window.setTimeout(() => {
      resolvedHoverClearTimerRef.current = null;
      setResolvedHoverState((current) => (
        current.visible ? current : { layerId: null, visible: false }
      ));
    }, transitionMs);
  }

  return (
    <svg
      className={["squircle-scene", `sq-theme-${theme}`, className].filter(Boolean).join(" ")}
      data-theme={theme}
      viewBox={sceneGeometry.viewBox}
      role="img"
      aria-label={ariaLabel}
      style={svgStyle}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {layerModels.map((model) => (
        <SquircleDefinitions key={`${model.prefix}-defs`} prefix={model.prefix} geometry={model.geometry} />
      ))}
      {layerModels.map(({ layer, index, prefix: layerPrefix, geometry: layerGeometry }) => (
        <SquircleLayer
          key={layer.id}
          layer={layer}
          hover={resolveLayerHover(layer, index, visibleLayers, resolvedHoverState.layerId, resolvedHoverState.visible)}
          geometry={layerGeometry}
          prefix={layerPrefix}
          motionTime={motionTime}
          selected={selectedLayerId === layer.id}
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
        id={`${prefix}-metal-main-blur`}
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
        id={`${prefix}-metal-light-blur`}
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
  hover,
  geometry,
  prefix,
  motionTime,
  selected
}: {
  layer: SquircleLayerConfig;
  hover: RenderHoverConfig | null;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionTime: number;
  selected: boolean;
}) {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  const hoverVariant = hover ? resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity) : null;
  const hasHover = Boolean(hoverVariant && variantSignature(hoverVariant) !== variantSignature(base));
  const cssHover = Boolean(hasHover && hover?.mode === "css");
  const controlledHoverEnabled = Boolean(hasHover && hover?.mode === "controlled" && hover.enabled);
  const x = layer.offset?.x ?? 0;
  const y = layer.offset?.y ?? 0;

  return (
    <g
      className={[
        "sq-layer",
        cssHover ? "sq-has-hover" : "",
        controlledHoverEnabled ? "sq-hover-enabled" : "",
        selected ? "is-selected" : "",
        layer.className
      ].filter(Boolean).join(" ")}
      data-layer-id={layer.id}
      data-hover-enabled={String(hasHover)}
      data-hover-mode={hover?.mode ?? "none"}
      data-hover-visible={String(controlledHoverEnabled)}
      transform={`translate(${x} ${y})`}
    >
      <SquircleVariant className="sq-base" variant={base} geometry={geometry} prefix={prefix} motionTime={motionTime} />
      {hasHover && hoverVariant ? <SquircleVariant className="sq-hover" variant={hoverVariant} geometry={geometry} prefix={prefix} motionTime={motionTime} /> : null}
    </g>
  );
}

type RenderHoverConfig = {
  enabled: boolean;
  mode: "css" | "controlled";
  variant: SquircleVariantConfig;
};

type ResolvedHoverState = {
  layerId: string | null;
  visible: boolean;
};

function resolveLayerHover(
  layer: SquircleLayerConfig,
  index: number,
  layers: SquircleLayerConfig[],
  hoveredLayerId: string | null,
  visible: boolean
): RenderHoverConfig | null {
  if (!layer.hover) return null;
  if (typeof layer.hover !== "function") {
    return { enabled: false, mode: "css", variant: layer.hover };
  }
  if (!hoveredLayerId) return null;

  const hoveredIndex = layers.findIndex((candidate) => candidate.id === hoveredLayerId);
  const hoveredLayer = hoveredIndex >= 0 ? layers[hoveredIndex] : null;
  if (!hoveredLayer) return null;

  const variant = layer.hover({
    layer,
    index,
    layers,
    hoveredLayerId,
    hoveredLayer,
    hoveredIndex
  });

  return variant ? { enabled: visible, mode: "controlled", variant } : null;
}

function createLayerClickEvent(
  layer: SquircleLayerConfig,
  index: number,
  layerElement: SVGGElement,
  event: ReactMouseEvent<SVGSVGElement>
): SquircleLayerClickEvent {
  return {
    layerId: layer.id,
    layer,
    index,
    layerElement,
    event
  };
}

function closestLayerElement(target: EventTarget | null, root: SVGSVGElement): SVGGElement | null {
  if (!(target instanceof Element)) return null;
  const layerElement = target.closest<SVGGElement>(".sq-layer[data-layer-id]");
  if (!layerElement || !root.contains(layerElement)) return null;
  return layerElement;
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
      {variant.line ? (
        <polygon
          className="sq-line"
          points={inlayPoints}
          stroke={linePaint(variant, palette, topFill)}
          strokeWidth={variant.material === "wireframe" ? variant.stroke.wireLine : variant.stroke.line}
          strokeDasharray={lineDasharray(variant.line)}
          strokeLinecap={lineStrokeLinecap(variant.line)}
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
  const effect = variant.material === "wireframe" ? "off" : variant.effect;
  const effectOpacity = variant.material === "transparent" ? fillOpacity : 1;
  const halfSize = geometry.config.halfSize;
  const baseRect = {
    x: -halfSize * 1.3,
    y: -halfSize * 1.3,
    size: halfSize * 2.6
  };

  if (effect === "metal") {
    return (
      <>
        <g className="sq-top-effect sq-top-effect-metal" clipPath={`url(#${topClipId})`} opacity={effectOpacity}>
          <g transform={geometry.labelTransform}>
            <rect
              x={baseRect.x}
              y={baseRect.y}
              width={baseRect.size}
              height={baseRect.size}
              fill={palette.effectColors[3]}
            />
            <g filter={`url(#${prefix}-metal-main-blur)`}>
              {METAL_BASE_BLOBS.map((blob) => (
                <MotionBlob key={blob.i} blob={blob} palette={palette} geometry={geometry} motionTime={motionTime} />
              ))}
            </g>
            <g filter={`url(#${prefix}-metal-light-blur)`} opacity={0.6} style={{ mixBlendMode: "screen" }}>
              {METAL_LIGHT_BLOBS.map((blob) => (
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
    text: normalizeTextValue(variant.text),
    line: normalizeLineStyle(variant.line),
    textStyle: normalizeTextStyle(variant.textStyle ?? "solid"),
    textColor: variant.textColor ?? "auto",
    textSize: variant.textSize ?? DEFAULT_TEXT_SIZE,
    textFontFamily: variant.textFontFamily ?? DEFAULT_TEXT_FONT_FAMILY,
    textFontWeight: variant.textFontWeight ?? DEFAULT_TEXT_FONT_WEIGHT,
    lineColor: variant.lineColor ?? "auto",
    stroke: { ...DEFAULT_STROKES, ...layerStroke, ...variant.stroke },
    opacity: { ...DEFAULT_OPACITY, ...layerOpacity, ...variant.opacity }
  };
}

function normalizeTextValue(value: SquircleVariantConfig["text"]): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  return null;
}

function normalizeTextStyle(style: SquircleTextStyle | string): SquircleTextStyle {
  return style === "wireframe" ? "wireframe" : "solid";
}

function normalizeEffect(effect: SquircleEffect | string): SquircleEffect {
  if (effect === "metal") return effect;
  return "off";
}

function normalizeLineStyle(line: SquircleVariantConfig["line"]): SquircleLineStyle | null {
  if (line === "solid" || line === "dotted" || line === "dashed") return line;
  return null;
}

function resolvePaletteId(paletteId: string | undefined): string {
  return isSquirclePaletteId(paletteId) ? paletteId : DEFAULT_PALETTE_ID;
}

function annotationPaint(color: SquircleAnnotationColor, labelFill: string): string {
  if (color === "white") return "#ffffff";
  if (color === "black") return "#05070a";
  return labelFill;
}

function linePaint(variant: ResolvedVariant, palette: RenderPalette, topFill: string): string {
  if (variant.material === "wireframe") return topFill;
  return annotationPaint(variant.lineColor, palette.labelFill);
}

function lineDasharray(line: SquircleLineStyle): string | undefined {
  if (line === "solid") return undefined;
  if (line === "dotted") return "0 7";
  return "9 8";
}

function lineStrokeLinecap(line: SquircleLineStyle): SVGProps<SVGPolygonElement>["strokeLinecap"] {
  return line === "dotted" ? "round" : "round";
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

    const update = (nextTime: number) => setTime(nextTime);
    update(performance.now() / 1000);
    motionClockSubscribers.add(update);
    startMotionClock();

    return () => {
      motionClockSubscribers.delete(update);
      stopMotionClockIfIdle();
    };
  }, [enabled]);

  return enabled ? time : 0;
}

function startMotionClock() {
  if (motionClockInterval !== null) return;

  motionClockInterval = window.setInterval(() => {
    const nextTime = performance.now() / 1000;
    motionClockSubscribers.forEach((subscriber) => subscriber(nextTime));
  }, MOTION_INTERVAL_MS);
}

function stopMotionClockIfIdle() {
  if (motionClockSubscribers.size > 0 || motionClockInterval === null) return;

  window.clearInterval(motionClockInterval);
  motionClockInterval = null;
}

function layerHasAnimatedSurface(layer: SquircleLayerConfig): boolean {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  if (variantHasAnimatedSurface(base)) return true;
  if (layer.hover && typeof layer.hover !== "function") {
    const hover = resolveVariant({ ...layer.base, ...layer.hover }, layer.stroke, layer.opacity);
    if (variantHasAnimatedSurface(hover)) return true;
  }
  return false;
}

function variantHasAnimatedSurface(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe" && variant.effect !== "off";
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
