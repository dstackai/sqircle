import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, SVGProps } from "react";
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
  SquirclePoint,
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
const GRAIN_OPACITY = 0.46;
const GRAIN_BASE_FREQUENCY = 2.4;
const GRAIN_OCTAVES = 3;
const GRAIN_CONTRAST_SLOPE = 2.2;
const GRAIN_CONTRAST_INTERCEPT = -0.22;
const MOTION_FRAME_MS = 50;
const motionClockSubscribers = new Set<(time: number) => void>();
let motionClockFrame: number | null = null;
let motionClockLastTime = 0;

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
  grain: boolean;
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

type LayerModel = {
  layer: SquircleLayerConfig;
  index: number;
  prefix: string;
  geometry: ReturnType<typeof createSquircleGeometry>;
};

type GrainOverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GrainOverlayBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type GrainOverlayModel = {
  key: string;
  visible: boolean;
  opacity: number;
  rect: GrainOverlayRect;
  clipPoints: string;
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MetalBackend = "blur" | "soft";

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
  const layerModels = useMemo<LayerModel[]>(() => visibleLayers.map((layer, index) => {
    const layerPrefix = `${prefix}-${index}-${safeIdPart(layer.id)}`;
    const layerGeometry = layer.geometry
      ? createLayerGeometry(geometry, viewBoxHeight, layer.geometry)
      : sceneGeometry;

    return { layer, index, prefix: layerPrefix, geometry: layerGeometry };
  }), [geometry, prefix, sceneGeometry, viewBoxHeight, visibleLayers]);
  const layerEventModels = useMemo(() => new Map(
    layerModels.map(({ layer, index }) => [layer.id, { layer, index }])
  ), [layerModels]);
  const sceneStyle = { "--sq-transition-ms": `${transitionMs}ms` } as CSSProperties;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hoveredLayerIdRef = useRef<string | null>(null);
  const [resolvedHoverState, setResolvedHoverState] = useState<ResolvedHoverState>({ layerId: null, visible: false });
  const resolvedHoverFrameRef = useRef<number | null>(null);
  const resolvedHoverClearTimerRef = useRef<number | null>(null);
  const hasHoverResolver = layerModels.some(({ layer }) => typeof layer.hover === "function");
  const hasGrainCandidate = layerModels.some(({ layer }) => layerHasGrainSurface(layer));
  const hoverMap = useMemo(() => createResolvedHoverMap({
    layerModels,
    layers: visibleLayers,
    hoverState: resolvedHoverState,
    controlledObjectHover: hasGrainCandidate
  }), [hasGrainCandidate, layerModels, visibleLayers, resolvedHoverState]);
  const motionEnabled = layerModels.some(({ layer }) => {
    if (layerHasAnimatedSurface(layer)) return true;
    const hover = hoverMap.get(layer.id);
    if (!hover?.enabled) return false;
    const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
    return variantHasAnimatedSurface(hoverVariant);
  });
  const [sceneInView, setSceneInView] = useState(true);
  const metalBackend = useMemo(detectMetalBackend, []);
  const motionActive = motionEnabled && sceneInView;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const grainOverlays = useMemo(() => createGrainOverlays({
    layerModels,
    hoverMap,
    sceneViewBox: sceneGeometry.viewBox
  }), [layerModels, hoverMap, sceneGeometry.viewBox]);
  const hasGrainOverlay = grainOverlays.length > 0;
  const shouldUseGrainWrapper = hasGrainCandidate || hasGrainOverlay;
  const needsPointerTracking = hasHoverResolver || hasGrainCandidate;

  useEffect(() => () => {
    if (resolvedHoverFrameRef.current !== null) {
      window.cancelAnimationFrame(resolvedHoverFrameRef.current);
    }
    if (resolvedHoverClearTimerRef.current !== null) {
      window.clearTimeout(resolvedHoverClearTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!motionEnabled || typeof IntersectionObserver === "undefined") {
      setSceneInView(true);
      return undefined;
    }

    const target = frameRef.current ?? svgRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver((entries) => {
      setSceneInView(entries.some((entry) => entry.isIntersecting));
    }, { rootMargin: "120px" });
    observer.observe(target);

    return () => observer.disconnect();
  }, [motionEnabled, shouldUseGrainWrapper]);

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

  useEffect(() => {
    if (!needsPointerTracking) return undefined;

    const root = svgRef.current;
    if (!root) return undefined;

    const handlePointerOver = (event: PointerEvent) => {
      const layerElement = closestLayerElement(event.target, root);
      const layerId = layerElement?.dataset.layerId;
      if (!layerElement || !layerId || hoveredLayerIdRef.current === layerId) return;

      hoveredLayerIdRef.current = layerId;
      showResolvedHover(layerId);
    };
    const handlePointerOut = (event: PointerEvent) => {
      const layerElement = closestLayerElement(event.target, root);
      const layerId = layerElement?.dataset.layerId;
      if (!layerElement || !layerId) return;

      const nextLayerElement = closestLayerElement(event.relatedTarget, root);
      const nextLayerId = nextLayerElement?.dataset.layerId ?? null;
      if (nextLayerId === layerId) return;

      if (!nextLayerId && hoveredLayerIdRef.current === layerId) {
        hoveredLayerIdRef.current = null;
        hideResolvedHover();
      }
    };

    root.addEventListener("pointerover", handlePointerOver, { passive: true });
    root.addEventListener("pointerout", handlePointerOut, { passive: true });

    return () => {
      root.removeEventListener("pointerover", handlePointerOver);
      root.removeEventListener("pointerout", handlePointerOut);
    };
  }, [needsPointerTracking, transitionMs]);

  const sceneSvg = (
    <svg
      ref={svgRef}
      className={["squircle-scene", `sq-theme-${theme}`, shouldUseGrainWrapper ? "" : className].filter(Boolean).join(" ")}
      data-theme={theme}
      viewBox={sceneGeometry.viewBox}
      role="img"
      aria-label={ariaLabel}
      style={shouldUseGrainWrapper ? undefined : sceneStyle}
      onClick={handleClick}
    >
      {layerModels.map((model) => (
        <SquircleDefinitions key={`${model.prefix}-defs`} prefix={model.prefix} geometry={model.geometry} />
      ))}
      {layerModels.map(({ layer, index, prefix: layerPrefix, geometry: layerGeometry }) => (
        <SquircleLayer
          key={layer.id}
          layer={layer}
          hover={hoverMap.get(layer.id) ?? null}
          geometry={layerGeometry}
          prefix={layerPrefix}
          motionEnabled={motionActive}
          metalBackend={metalBackend}
          selected={selectedLayerId === layer.id}
        />
      ))}
    </svg>
  );

  if (!shouldUseGrainWrapper) return sceneSvg;

  return (
    <div className={["squircle-scene-root", className].filter(Boolean).join(" ")} style={sceneStyle}>
      <div className="squircle-scene-frame" ref={frameRef}>
        {sceneSvg}
        {hasGrainOverlay ? <GrainOverlay prefix={prefix} overlays={grainOverlays} /> : null}
      </div>
    </div>
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
      {Object.values(SQUIRCLE_PALETTES).map((palette) => {
        const effectColors = alphaPaletteEffectColors(palette);

        return (
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
            {effectColors.map((color, index) => (
              <SoftRadialGradient key={`${palette.id}-${index}`} id={`${prefix}-soft-${palette.id}-${index}`} color={color} />
            ))}
          </g>
        );
      })}
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

function SoftRadialGradient({ id, color }: { id: string; color: string }) {
  return (
    <radialGradient id={id} cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor={color} stopOpacity={1} />
      <stop offset="0.58" stopColor={color} stopOpacity={0.72} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
}

function SquircleLayer({
  layer,
  hover,
  geometry,
  prefix,
  motionEnabled,
  metalBackend,
  selected
}: {
  layer: SquircleLayerConfig;
  hover: RenderHoverConfig | null;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
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
      <SquircleVariant className="sq-base" variant={base} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} />
      {hasHover && hoverVariant ? <SquircleVariant className="sq-hover" variant={hoverVariant} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} /> : null}
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
  visible: boolean,
  controlledObjectHover: boolean
): RenderHoverConfig | null {
  if (!layer.hover) return null;
  if (typeof layer.hover !== "function") {
    return {
      enabled: controlledObjectHover && hoveredLayerId === layer.id && visible,
      mode: controlledObjectHover ? "controlled" : "css",
      variant: layer.hover
    };
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

function createResolvedHoverMap({
  layerModels,
  layers,
  hoverState,
  controlledObjectHover
}: {
  layerModels: LayerModel[];
  layers: SquircleLayerConfig[];
  hoverState: ResolvedHoverState;
  controlledObjectHover: boolean;
}): Map<string, RenderHoverConfig | null> {
  return new Map(layerModels.map(({ layer, index }) => [
    layer.id,
    resolveLayerHover(layer, index, layers, hoverState.layerId, hoverState.visible, controlledObjectHover)
  ]));
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
  motionEnabled,
  metalBackend
}: {
  className: string;
  variant: ResolvedVariant;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
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
            motionEnabled={motionEnabled}
            metalBackend={metalBackend}
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
  motionEnabled,
  metalBackend
}: {
  variant: ResolvedVariant;
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  topClipId: string;
  topFill: string;
  topPoints: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
}) {
  const fillOpacity = variant.material === "transparent" ? variant.opacity.transparentFace : 1;
  const effect = variant.material === "wireframe" ? "off" : variant.effect;
  const effectOpacity = variant.material === "transparent" ? fillOpacity : 1;

  if (effect === "mesh") {
    return (
      <>
        <MeshTopSurface
          palette={palette}
          geometry={geometry}
          prefix={prefix}
          topClipId={topClipId}
          opacity={effectOpacity}
          motionEnabled={motionEnabled}
        />
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

  if (effect === "metal") {
    return (
      <>
        <MetalTopSurface
          palette={palette}
          geometry={geometry}
          prefix={prefix}
          topClipId={topClipId}
          opacity={effectOpacity}
          motionEnabled={motionEnabled}
          backend={metalBackend}
        />
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

function MeshTopSurface({
  palette,
  geometry,
  prefix,
  topClipId,
  opacity,
  motionEnabled
}: {
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  topClipId: string;
  opacity: number;
  motionEnabled: boolean;
}) {
  const meshUid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const topStartRef = useRef<SVGStopElement | null>(null);
  const topEndRef = useRef<SVGStopElement | null>(null);
  const bottomStartRef = useRef<SVGStopElement | null>(null);
  const bottomEndRef = useRef<SVGStopElement | null>(null);
  const halfSize = geometry.config.halfSize;
  const baseRect = createEffectBaseRect(halfSize);
  const initialColors = meshColors(palette, 0);
  const topRowId = `${prefix}-mesh-top-${meshUid}`;
  const bottomRowId = `${prefix}-mesh-bottom-${meshUid}`;
  const maskGradientId = `${prefix}-mesh-mask-gradient-${meshUid}`;
  const maskId = `${prefix}-mesh-mask-${meshUid}`;

  useMotionFrame(motionEnabled, (time) => {
    const colors = meshColors(palette, time);
    topStartRef.current?.setAttribute("stop-color", colors.tl);
    topEndRef.current?.setAttribute("stop-color", colors.tr);
    bottomStartRef.current?.setAttribute("stop-color", colors.bl);
    bottomEndRef.current?.setAttribute("stop-color", colors.br);
  });

  return (
    <g className="sq-top-effect sq-top-effect-mesh" clipPath={`url(#${topClipId})`} opacity={opacity}>
      <defs>
        <linearGradient id={topRowId} gradientUnits="userSpaceOnUse" x1={-halfSize} y1={0} x2={halfSize} y2={0}>
          <stop ref={topStartRef} offset="0" stopColor={initialColors.tl} />
          <stop ref={topEndRef} offset="1" stopColor={initialColors.tr} />
        </linearGradient>
        <linearGradient id={bottomRowId} gradientUnits="userSpaceOnUse" x1={-halfSize} y1={0} x2={halfSize} y2={0}>
          <stop ref={bottomStartRef} offset="0" stopColor={initialColors.bl} />
          <stop ref={bottomEndRef} offset="1" stopColor={initialColors.br} />
        </linearGradient>
        <linearGradient id={maskGradientId} gradientUnits="userSpaceOnUse" x1={0} y1={-halfSize} x2={0} y2={halfSize}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={baseRect.x} y={baseRect.y} width={baseRect.size} height={baseRect.size}>
          <rect x={baseRect.x} y={baseRect.y} width={baseRect.size} height={baseRect.size} fill={`url(#${maskGradientId})`} />
        </mask>
      </defs>
      <g transform={geometry.labelTransform}>
        <rect x={baseRect.x} y={baseRect.y} width={baseRect.size} height={baseRect.size} fill={`url(#${bottomRowId})`} />
        <rect x={baseRect.x} y={baseRect.y} width={baseRect.size} height={baseRect.size} fill={`url(#${topRowId})`} mask={`url(#${maskId})`} />
      </g>
    </g>
  );
}

function MetalTopSurface({
  palette,
  geometry,
  prefix,
  topClipId,
  opacity,
  motionEnabled,
  backend
}: {
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  topClipId: string;
  opacity: number;
  motionEnabled: boolean;
  backend: MetalBackend;
}) {
  const halfSize = geometry.config.halfSize;
  const baseRect = createEffectBaseRect(halfSize);

  if (backend === "soft") {
    return (
      <g className="sq-top-effect sq-top-effect-metal sq-top-effect-metal-soft" clipPath={`url(#${topClipId})`} opacity={opacity}>
        <g transform={geometry.labelTransform}>
          <rect
            x={baseRect.x}
            y={baseRect.y}
            width={baseRect.size}
            height={baseRect.size}
            fill={palette.effectColors[3]}
          />
          <g>
            {METAL_BASE_BLOBS.map((blob) => (
              <MotionBlob
                key={blob.i}
                blob={blob}
                fill={`url(#${prefix}-soft-${palette.id}-${blob.slot})`}
                geometry={geometry}
                motionEnabled={motionEnabled}
                radiusScale={1.44}
              />
            ))}
          </g>
          <g opacity={0.46}>
            {METAL_LIGHT_BLOBS.map((blob) => (
              <MotionBlob
                key={blob.i}
                blob={blob}
                fill={`url(#${prefix}-soft-${palette.id}-${blob.slot})`}
                geometry={geometry}
                motionEnabled={motionEnabled}
                radiusScale={1.32}
              />
            ))}
          </g>
        </g>
      </g>
    );
  }

  return (
    <g className="sq-top-effect sq-top-effect-metal sq-top-effect-metal-blur" clipPath={`url(#${topClipId})`} opacity={opacity}>
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
            <MotionBlob
              key={blob.i}
              blob={blob}
              fill={palette.effectColors[blob.slot] ?? palette.effectColors[3]}
              geometry={geometry}
              motionEnabled={motionEnabled}
            />
          ))}
        </g>
        <g filter={`url(#${prefix}-metal-light-blur)`} opacity={0.6} style={{ mixBlendMode: "screen" }}>
          {METAL_LIGHT_BLOBS.map((blob) => (
            <MotionBlob
              key={blob.i}
              blob={blob}
              fill={palette.effectColors[blob.slot] ?? palette.effectColors[3]}
              geometry={geometry}
              motionEnabled={motionEnabled}
            />
          ))}
        </g>
      </g>
    </g>
  );
}

function MotionBlob({
  blob,
  fill,
  geometry,
  motionEnabled,
  radiusScale = 1
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
  fill: string;
  geometry: ReturnType<typeof createSquircleGeometry>;
  motionEnabled: boolean;
  radiusScale?: number;
}) {
  const ref = useRef<SVGCircleElement | null>(null);
  const halfSize = geometry.config.halfSize;
  const planeWidth = halfSize * 2;
  const x = halfSize * blob.x;
  const y = halfSize * blob.y;
  const radius = planeWidth * blob.r * radiusScale;
  const ax = planeWidth * blob.ax;
  const ay = planeWidth * blob.ay;
  const ar = planeWidth * blob.ar * radiusScale;
  const initial = motionBlobFrame({ blob, x, y, radius, ax, ay, ar, time: 0 });

  useMotionFrame(motionEnabled, (time) => {
    const element = ref.current;
    if (!element) return;

    const frame = motionBlobFrame({ blob, x, y, radius, ax, ay, ar, time });
    element.setAttribute("cx", String(frame.cx));
    element.setAttribute("cy", String(frame.cy));
    element.setAttribute("r", String(frame.r));
  });

  return (
    <circle
      ref={ref}
      cx={initial.cx}
      cy={initial.cy}
      r={initial.r}
      fill={fill}
    />
  );
}

function resolveVariant(
  variant: SquircleVariantConfig,
  layerStroke: Partial<SquircleStrokeConfig> = {},
  layerOpacity: Partial<SquircleOpacityConfig> = {}
): ResolvedVariant {
  const material = variant.material ?? "wireframe";

  return {
    material,
    paletteId: resolvePaletteId(variant.paletteId),
    effect: normalizeEffect(variant.effect ?? DEFAULT_EFFECT),
    grain: material !== "wireframe" && variant.grain === true,
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
  if (effect === "metal" || effect === "mesh") return effect;
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

function createEffectBaseRect(halfSize: number) {
  return {
    x: -halfSize * 1.3,
    y: -halfSize * 1.3,
    size: halfSize * 2.6
  };
}

function meshColors(palette: RenderPalette, time: number): { tl: string; tr: string; bl: string; br: string } {
  const alpha = 0.5 - 0.5 * Math.cos(0.6 * time);
  const beta = 0.5 - 0.5 * Math.cos(0.43 * time + 1.1);
  const homeBL = 0;
  const homeBR = 0.66;
  const homeTR = 1;
  const homeTL = 0.33;
  const levelBL = homeBL + (homeTR - homeBL) * alpha;
  const levelTR = homeTR + (homeBL - homeTR) * alpha;
  const levelBR = homeBR + (homeTL - homeBR) * beta;
  const levelTL = homeTL + (homeBR - homeTL) * beta;

  return {
    tl: sampleStops(palette.top, levelTL),
    tr: sampleStops(palette.top, levelTR),
    bl: sampleStops(palette.top, levelBL),
    br: sampleStops(palette.top, levelBR)
  };
}

function motionBlobFrame({
  blob,
  x,
  y,
  radius,
  ax,
  ay,
  ar,
  time
}: {
  blob: { sp: number; i: number };
  x: number;
  y: number;
  radius: number;
  ax: number;
  ay: number;
  ar: number;
  time: number;
}): { cx: number; cy: number; r: number } {
  return {
    cx: roundNumber(x + ax * Math.sin(time * 0.62 * blob.sp + blob.i * 1.7) + 0.5 * ax * Math.cos(time * 0.4 * blob.sp + blob.i * 0.6)),
    cy: roundNumber(y + ay * Math.cos(time * 0.55 * blob.sp + blob.i * 2.1) + 0.55 * ay * Math.sin(time * 0.34 * blob.sp + blob.i)),
    r: roundNumber(Math.max(4, radius + ar * Math.sin(time * 0.8 + blob.i * 1.2)))
  };
}

function variantSignature(variant: ResolvedVariant): string {
  return JSON.stringify(variant);
}

function useMotionFrame(enabled: boolean, callback: (time: number) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;

    const update = (time: number) => callbackRef.current(time);
    update(performance.now() / 1000);
    motionClockSubscribers.add(update);
    startMotionClock();

    return () => {
      motionClockSubscribers.delete(update);
      stopMotionClockIfIdle();
    };
  }, [enabled]);
}

function startMotionClock() {
  if (motionClockFrame !== null) return;

  const tick = (now: number) => {
    motionClockFrame = window.requestAnimationFrame(tick);
    if (now - motionClockLastTime < MOTION_FRAME_MS) return;

    motionClockLastTime = now;
    if (document.hidden) return;

    const nextTime = now / 1000;
    motionClockSubscribers.forEach((subscriber) => subscriber(nextTime));
  };

  motionClockFrame = window.requestAnimationFrame(tick);
}

function stopMotionClockIfIdle() {
  if (motionClockSubscribers.size > 0 || motionClockFrame === null) return;

  window.cancelAnimationFrame(motionClockFrame);
  motionClockFrame = null;
  motionClockLastTime = 0;
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

function layerHasGrainSurface(layer: SquircleLayerConfig): boolean {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  if (variantHasGrainSurface(base)) return true;
  if (layer.hover && typeof layer.hover !== "function") {
    const hover = resolveVariant({ ...layer.base, ...layer.hover }, layer.stroke, layer.opacity);
    if (variantHasGrainSurface(hover)) return true;
  }
  return false;
}

function variantHasGrainSurface(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe" && variant.grain;
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

function sampleStops(stops: SquircleGradientStop[], t: number): string {
  if (stops.length === 0) return "#000000";
  const clamped = Math.max(0, Math.min(1, t));

  for (let index = 0; index < stops.length - 1; index += 1) {
    const a = stops[index];
    const b = stops[index + 1];
    if (!a || !b) continue;

    if (clamped <= b.offset || index === stops.length - 2) {
      const span = b.offset - a.offset;
      const amount = span <= 0 ? 0 : Math.max(0, Math.min(1, (clamped - a.offset) / span));
      return mixHex(a.color, b.color, amount);
    }
  }

  return stops.at(-1)?.color ?? "#000000";
}

function mixHex(colorA: string, colorB: string, amount: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a[0] + (b[0] - a[0]) * amount);
  const g = Math.round(a[1] + (b[1] - a[1]) * amount);
  const bl = Math.round(a[2] + (b[2] - a[2]) * amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((char) => char + char).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(1));
}

function detectMetalBackend(): MetalBackend {
  if (typeof navigator === "undefined") return "blur";

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const isIOS = /\b(iPad|iPhone|iPod)\b/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android)/i.test(ua);

  return isIOS || isSafari ? "soft" : "blur";
}

function createGrainOverlays({
  layerModels,
  hoverMap,
  sceneViewBox
}: {
  layerModels: LayerModel[];
  hoverMap: Map<string, RenderHoverConfig | null>;
  sceneViewBox: string;
}): GrainOverlayModel[] {
  const viewBox = parseViewBox(sceneViewBox);
  const overlays: GrainOverlayModel[] = [];

  layerModels.forEach(({ layer, prefix, geometry }) => {
    const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
    const hover = hoverMap.get(layer.id) ?? null;
    const hoverVariant = hover ? resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity) : null;
    const hasHover = Boolean(hoverVariant && variantSignature(hoverVariant) !== variantSignature(base));
    const hoverEnabled = Boolean(hasHover && hover?.enabled);
    const offset = { x: layer.offset?.x ?? 0, y: layer.offset?.y ?? 0 };

    if (variantHasGrainSurface(base)) {
      overlays.push(createGrainOverlay({
        key: `${prefix}-base`,
        geometry,
        offset,
        viewBox,
        opacity: grainOverlayOpacity(base) * (hoverEnabled ? 0 : 1)
      }));
    }

    if (hasHover && hoverVariant && variantHasGrainSurface(hoverVariant)) {
      overlays.push(createGrainOverlay({
        key: `${prefix}-hover`,
        geometry,
        offset,
        viewBox,
        opacity: grainOverlayOpacity(hoverVariant) * (hoverEnabled ? 1 : 0)
      }));
    }
  });

  return overlays;
}

function createGrainOverlay({
  key,
  geometry,
  offset,
  viewBox,
  opacity
}: {
  key: string;
  geometry: ReturnType<typeof createSquircleGeometry>;
  offset: SquirclePoint;
  viewBox: ViewBox;
  opacity: number;
}): GrainOverlayModel {
  const points = geometry.topPoints.map((point) => ({
    x: point.x + offset.x,
    y: point.y + offset.y
  }));
  const bounds = createGrainOverlayBounds(points);

  return {
    key,
    visible: bounds.maxX > bounds.minX && bounds.maxY > bounds.minY,
    opacity,
    rect: createGrainOverlayRect(bounds, viewBox),
    clipPoints: createGrainClipPoints(points, bounds)
  };
}

function createGrainOverlayBounds(points: SquirclePoint[]): GrainOverlayBounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function createGrainOverlayRect(bounds: GrainOverlayBounds, viewBox: ViewBox): GrainOverlayRect {
  return {
    x: (bounds.minX - viewBox.x) / viewBox.width,
    y: (bounds.minY - viewBox.y) / viewBox.height,
    width: (bounds.maxX - bounds.minX) / viewBox.width,
    height: (bounds.maxY - bounds.minY) / viewBox.height
  };
}

function createGrainClipPoints(points: SquirclePoint[], bounds: GrainOverlayBounds): string {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return points.map((point) => [
    roundUnit((point.x - bounds.minX) / width),
    roundUnit((point.y - bounds.minY) / height)
  ].join(",")).join(" ");
}

function grainOverlayOpacity(variant: ResolvedVariant): number {
  if (!variantHasGrainSurface(variant)) return 0;
  if (variant.material === "transparent") return GRAIN_OPACITY * variant.opacity.transparentFace;
  return GRAIN_OPACITY;
}

function parseViewBox(viewBox: string): ViewBox {
  const [x = 0, y = 0, width = 800, height = 480] = viewBox.split(/\s+/).map(Number);

  return {
    x,
    y,
    width: width || 800,
    height: height || 480
  };
}

function GrainOverlay({ prefix, overlays }: { prefix: string; overlays: GrainOverlayModel[] }) {
  const filterId = `${prefix}-grain`;
  const visibleOverlays = overlays.filter((overlay) => overlay.visible);
  if (visibleOverlays.length === 0) return null;

  return (
    <svg
      className="sq-grain-overlay"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={filterId}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
        >
          <feTurbulence type="fractalNoise" baseFrequency={GRAIN_BASE_FREQUENCY} numOctaves={GRAIN_OCTAVES} seed={14} result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope={GRAIN_CONTRAST_SLOPE} intercept={GRAIN_CONTRAST_INTERCEPT} />
            <feFuncG type="linear" slope={GRAIN_CONTRAST_SLOPE} intercept={GRAIN_CONTRAST_INTERCEPT} />
            <feFuncB type="linear" slope={GRAIN_CONTRAST_SLOPE} intercept={GRAIN_CONTRAST_INTERCEPT} />
            <feFuncA type="linear" slope={0} intercept={1} />
          </feComponentTransfer>
        </filter>
        {visibleOverlays.map((overlay) => (
          <clipPath key={`${overlay.key}-clip`} id={`${prefix}-grain-clip-${overlay.key}`} clipPathUnits="objectBoundingBox">
            <polygon points={overlay.clipPoints} />
          </clipPath>
        ))}
      </defs>
      {visibleOverlays.map((overlay) => (
        <svg
          key={overlay.key}
          x={`${roundPercent(overlay.rect.x)}%`}
          y={`${roundPercent(overlay.rect.y)}%`}
          width={`${roundPercent(overlay.rect.width)}%`}
          height={`${roundPercent(overlay.rect.height)}%`}
          overflow="hidden"
          preserveAspectRatio="none"
        >
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            clipPath={`url(#${prefix}-grain-clip-${overlay.key})`}
            filter={`url(#${filterId})`}
            style={{ opacity: overlay.opacity }}
          />
        </svg>
      ))}
    </svg>
  );
}

function roundPercent(value: number): number {
  return Number((value * 100).toFixed(4));
}

function roundUnit(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(5));
}
