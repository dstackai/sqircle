import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, MutableRefObject, SVGProps } from "react";
import { createSquircleGeometry, pointsToString } from "./geometry";
import {
  DEFAULT_PALETTE_ID,
  getSquirclePalette,
  isSquirclePaletteId,
  SQUIRCLE_PALETTES
} from "./palettes";
import type { SquircleGradientStop, SquirclePalette } from "./palettes";
import type {
  SquircleAnnotationColor,
  SquircleGeometryConfig,
  SquircleLayerClickEvent,
  SquircleLayerConfig,
  SquircleLayerGeometryConfig,
  SquircleLayerHoverState,
  SquircleLineStyle,
  SquircleMaterial,
  SquircleOpacityConfig,
  SquirclePoint,
  SquircleSceneProps,
  SquircleStrokeConfig,
  SquircleEffect,
  SquircleTheme,
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
  transparentFace: 0.26,
  transparentAnnotation: 0.88,
  solidAnnotation: 0.88
};

const DEFAULT_TEXT = "GPU";
const DEFAULT_TEXT_SIZE = 62;
const DEFAULT_TEXT_FONT_FAMILY = "Arial, Helvetica, sans-serif";
const DEFAULT_TEXT_FONT_WEIGHT = 400;
const DEFAULT_EFFECT: SquircleEffect = "off";
const ANNOTATION_BLACK = "#05070a";
const ANNOTATION_WHITE = "#ffffff";
const GLASS_BACKGROUND_BY_THEME: Record<SquircleTheme, string> = {
  light: "#ffffff",
  dark: "#101925"
};
const GRAIN_OPACITY = 0.46;
const GRAIN_BASE_FREQUENCY = 2.4;
const GRAIN_OCTAVES = 3;
const GRAIN_CONTRAST_SLOPE = 2.2;
const GRAIN_CONTRAST_INTERCEPT = -0.22;
const MOTION_FRAME_MS = 50;
const MAX_PROGRAMMATIC_TRANSITION_SNAPSHOTS = 8;
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
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
  material: ResolvedMaterial;
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

type ResolvedMaterial = Exclude<SquircleMaterial, "transparent">;

type EffectColorSet = readonly [string, string, string, string, string, string, string];

type RenderPalette = {
  id: string;
  labelFill: string;
  topEdge: string;
  sideEdge: string;
  top: SquircleGradientStop[];
  side: SquircleGradientStop[];
  wire: SquircleGradientStop[];
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
  instant: boolean;
  rect: GrainOverlayRect;
  clipPoints: string;
  occlusionPoints: string[];
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MetalBackend = "blur" | "soft";

type ProgrammaticLayerVisualState = {
  layerId: string;
  prefix: string;
  index: number;
  geometry: ReturnType<typeof createSquircleGeometry>;
  geometrySignature: string;
  offset: SquirclePoint;
  offsetSignature: string;
  theme: SquircleTheme;
  variant: ResolvedVariant;
  visible: boolean;
  signature: string;
};

type ProgrammaticLayerSnapshot = ProgrammaticLayerVisualState & {
  key: string;
  exiting: boolean;
  annotationsOnly: boolean;
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
  transitionConfigChanges = true,
  onLayerClick
}: SquircleSceneProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const prefix = idPrefix ?? `sq-${reactId}`;
  const geometryKey = JSON.stringify(geometry ?? {});
  const baseGeometry = useMemo(() => createSquircleGeometry(geometry), [geometryKey]);
  const renderLayers = layers;
  const fittingLayers = renderLayers;
  const layerGeometryKey = JSON.stringify(renderLayers.map((layer) => ({
    id: layer.id,
    geometry: layer.geometry,
    offset: layer.offset
  })));
  const layerExtent = useMemo(() => Math.max(
    0,
    ...fittingLayers.map((layer) => {
      const layerGeometry = createLayerGeometry(geometry, undefined, layer.geometry);
      return (layer.offset?.y ?? 0) + layerGeometry.sideBounds.maxY;
    })
  ), [geometryKey, layerGeometryKey, fittingLayers]);
  const viewBoxHeight = geometry?.viewBoxHeight ?? (fitToLayers ? Math.max(baseGeometry.config.viewBoxHeight, layerExtent + 18) : baseGeometry.config.viewBoxHeight);
  const sceneGeometry = useMemo(() => (geometry?.viewBoxHeight === viewBoxHeight
    ? baseGeometry
    : createSquircleGeometry({ ...geometry, viewBoxHeight })), [baseGeometry, geometry, viewBoxHeight]);
  const layerModels = useMemo<LayerModel[]>(() => renderLayers.map((layer, index) => {
    const layerPrefix = `${prefix}-${index}-${safeIdPart(layer.id)}`;
    const layerGeometry = layer.geometry
      ? createLayerGeometry(geometry, viewBoxHeight, layer.geometry)
      : sceneGeometry;

    return { layer, index, prefix: layerPrefix, geometry: layerGeometry };
  }), [geometry, prefix, sceneGeometry, viewBoxHeight, renderLayers]);
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
  const controlledObjectHoverLayerIds = useMemo(() => new Set(
    layerModels.flatMap(({ layer }, index) => {
      const lowerGrainCanBeOccluded = layerModels
        .slice(0, index)
        .some(({ layer: lowerLayer }) => layerHasGrainSurface(lowerLayer));

      return layerRequiresControlledObjectHover(layer, lowerGrainCanBeOccluded) ? [layer.id] : [];
    })
  ), [layerModels]);
  const controlledHoverTargetIds = useMemo(() => {
    if (hasHoverResolver) return new Set(layerModels.map(({ layer }) => layer.id));
    return controlledObjectHoverLayerIds;
  }, [controlledObjectHoverLayerIds, hasHoverResolver, layerModels]);
  const controlledHoverTargetIdsRef = useRef<Set<string>>(controlledHoverTargetIds);
  const hasGrainCandidate = layerModels.some(({ layer }) => layerHasGrainSurface(layer));
  const hoverMap = useMemo(() => createResolvedHoverMap({
    layerModels,
    layers: renderLayers,
    hoverState: resolvedHoverState,
    controlledObjectHoverLayerIds
  }), [controlledObjectHoverLayerIds, layerModels, renderLayers, resolvedHoverState]);
  const motionEnabled = layerModels.some(({ layer }) => {
    const hover = hoverMap.get(layer.id);
    if (hover?.enabled) {
      if (!effectiveLayerVisible(layer, hover)) return false;
      const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
      return variantHasAnimatedSurface(hoverVariant);
    }

    if (layer.visible === false) return false;
    const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
    return variantHasAnimatedSurface(base);
  });
  const [sceneInView, setSceneInView] = useState(true);
  const metalBackend = useMemo(detectMetalBackend, []);
  const motionActive = motionEnabled && sceneInView;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const programmaticTransitions = useProgrammaticLayerTransitions({
    layerModels,
    hoverMap,
    theme,
    transitionMs,
    enabled: transitionConfigChanges
  });
  const programmaticSnapshotsByLayerId = useMemo(() => groupProgrammaticSnapshotsByLayerId(programmaticTransitions.snapshots), [programmaticTransitions.snapshots]);
  const grainOverlays = useMemo(() => createGrainOverlays({
    layerModels,
    hoverMap,
    programmaticSnapshots: programmaticTransitions.snapshots,
    programmaticEnteringLayerIds: programmaticTransitions.enteringLayerIds,
    programmaticInstantLayerIds: programmaticTransitions.instantLayerIds,
    sceneViewBox: sceneGeometry.viewBox
  }), [
    layerModels,
    hoverMap,
    programmaticTransitions.enteringLayerIds,
    programmaticTransitions.instantLayerIds,
    programmaticTransitions.snapshots,
    sceneGeometry.viewBox
  ]);
  const hasGrainOverlay = grainOverlays.length > 0;
  const shouldUseGrainWrapper = hasGrainCandidate || hasGrainOverlay;
  const needsPointerTracking = controlledHoverTargetIds.size > 0;

  useEffect(() => {
    controlledHoverTargetIdsRef.current = controlledHoverTargetIds;
  }, [controlledHoverTargetIds]);

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
    const isControlledHoverTarget = (layerId: string | null | undefined) => (
      Boolean(layerId && controlledHoverTargetIdsRef.current.has(layerId))
    );

    const handlePointerOver = (event: PointerEvent) => {
      const layerElement = closestLayerElement(event.target, root);
      const layerId = layerElement?.dataset.layerId;
      if (!layerElement || !layerId) return;

      if (!isControlledHoverTarget(layerId)) {
        if (hoveredLayerIdRef.current) {
          hoveredLayerIdRef.current = null;
          hideResolvedHover();
        }
        return;
      }
      if (hoveredLayerIdRef.current === layerId) return;

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
      if (isControlledHoverTarget(nextLayerId)) return;

      if (hoveredLayerIdRef.current === layerId) {
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
        <SquircleDefinitions key={`${model.prefix}-defs`} prefix={model.prefix} geometry={model.geometry} theme={theme} />
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
          theme={theme}
          selected={selectedLayerId === layer.id}
          entering={programmaticTransitions.enteringLayerIds.has(layer.id)}
          instant={programmaticTransitions.instantLayerIds.has(layer.id)}
          snapshots={programmaticSnapshotsByLayerId.get(layer.id) ?? []}
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

function baseLayerVisible(layer: SquircleLayerConfig): boolean {
  return layer.visible !== false;
}

function hoverLayerVisible(layer: SquircleLayerConfig, hover: RenderHoverConfig | null): boolean {
  return hover?.visible ?? baseLayerVisible(layer);
}

function effectiveLayerVisible(layer: SquircleLayerConfig, hover: RenderHoverConfig | null): boolean {
  return hover?.enabled ? hoverLayerVisible(layer, hover) : baseLayerVisible(layer);
}

function useProgrammaticLayerTransitions({
  layerModels,
  hoverMap,
  theme,
  transitionMs,
  enabled
}: {
  layerModels: LayerModel[];
  hoverMap: Map<string, RenderHoverConfig | null>;
  theme: SquircleTheme;
  transitionMs: number;
  enabled: boolean;
}): {
  snapshots: ProgrammaticLayerSnapshot[];
  enteringLayerIds: Set<string>;
  instantLayerIds: Set<string>;
} {
  const visualStates = useMemo(() => layerModels.map((model) => (
    createProgrammaticVisualState(model, hoverMap.get(model.layer.id) ?? null, theme)
  )), [layerModels, hoverMap, theme]);
  const visualStateKey = useMemo(() => JSON.stringify(visualStates.map((state) => ({
    layerId: state.layerId,
    prefix: state.prefix,
    geometry: state.geometrySignature,
    offset: state.offsetSignature,
    theme: state.theme,
    signature: state.signature
  }))), [visualStates]);
  const programmaticStateKey = useMemo(() => createProgrammaticStateKey(layerModels, theme), [layerModels, theme]);
  const previousStatesRef = useRef<Map<string, ProgrammaticLayerVisualState>>(new Map());
  const previousProgrammaticStateKeyRef = useRef<string | null>(null);
  const nextSnapshotIdRef = useRef(0);
  const framesRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);
  const [snapshots, setSnapshots] = useState<ProgrammaticLayerSnapshot[]>([]);
  const [enteringLayerIds, setEnteringLayerIds] = useState<Set<string>>(() => new Set());
  const [instantLayerIds, setInstantLayerIds] = useState<Set<string>>(() => new Set());

  useIsomorphicLayoutEffect(() => {
    const previousStates = previousStatesRef.current;
    const previousProgrammaticStateKey = previousProgrammaticStateKeyRef.current;
    const nextStates = new Map(visualStates.map((state) => [state.layerId, state]));
    const addedSnapshots: ProgrammaticLayerSnapshot[] = [];
    const enteringIds = new Set<string>();
    const instantIds = new Set<string>();
    const programmaticStateChanged = previousProgrammaticStateKey !== null
      && previousProgrammaticStateKey !== programmaticStateKey;
    const shouldAnimate = Boolean(
      enabled
      && transitionMs > 0
      && programmaticStateChanged
    );

    visualStates.forEach((state) => {
      const previous = previousStates.get(state.layerId);
      if (!previous || previous.signature === state.signature) return;
      const canAnimate = shouldAnimate && canAnimateProgrammaticVisualState(previous, state);
      if (!canAnimate) {
        if (programmaticStateChanged) instantIds.add(state.layerId);
        return;
      }
      const visibilityOnlyChange = isVisibilityOnlyProgrammaticChange(previous, state);

      if (previous.visible && !visibilityOnlyChange) {
        addedSnapshots.push({
          ...previous,
          key: `${previous.layerId}-program-${nextSnapshotIdRef.current++}`,
          exiting: false,
          annotationsOnly: surfaceSignature(previous.variant) === surfaceSignature(state.variant)
        });
      }
      if (state.visible) enteringIds.add(state.layerId);
      if (!state.visible && !visibilityOnlyChange) instantIds.add(state.layerId);
    });

    previousStatesRef.current = nextStates;
    previousProgrammaticStateKeyRef.current = programmaticStateKey;

    if (programmaticStateChanged) {
      setSnapshots((current) => {
        const pruned = current.filter((snapshot) => {
          const next = nextStates.get(snapshot.layerId);
          return next ? canAnimateProgrammaticVisualState(snapshot, next) : false;
        });
        return pruned.length === current.length ? current : pruned;
      });
      setEnteringLayerIds((current) => {
        if (current.size === 0) return current;
        const pruned = new Set([...current].filter((layerId) => nextStates.has(layerId)));
        return pruned.size === current.size ? current : pruned;
      });
    }

    if (!enabled || transitionMs <= 0) {
      setSnapshots((current) => (current.length > 0 ? [] : current));
      setEnteringLayerIds((current) => (current.size > 0 ? new Set() : current));
    } else if (addedSnapshots.length > 0 || enteringIds.size > 0) {
      if (addedSnapshots.length > 0) {
        setSnapshots((current) => [
          ...current,
          ...addedSnapshots
        ].slice(-MAX_PROGRAMMATIC_TRANSITION_SNAPSHOTS));
      }
      if (enteringIds.size > 0) {
        setEnteringLayerIds((current) => {
          const next = new Set(current);
          enteringIds.forEach((layerId) => next.add(layerId));
          return next;
        });
      }
    }

    if (instantIds.size > 0) {
      setInstantLayerIds((current) => {
        const next = new Set(current);
        instantIds.forEach((layerId) => next.add(layerId));
        return next;
      });
    }

    const snapshotKeys = new Set(addedSnapshots.map((snapshot) => snapshot.key));
    if (snapshotKeys.size === 0 && enteringIds.size === 0 && instantIds.size === 0) return undefined;

    requestAfterNextPaint(framesRef, () => {
      if (snapshotKeys.size > 0) {
        setSnapshots((current) => current.map((snapshot) => (
          snapshotKeys.has(snapshot.key) ? { ...snapshot, exiting: true } : snapshot
        )));
      }
      if (enteringIds.size > 0) {
        setEnteringLayerIds((current) => {
          if (current.size === 0) return current;
          const next = new Set(current);
          enteringIds.forEach((layerId) => next.delete(layerId));
          return next;
        });
      }
      if (instantIds.size > 0) {
        setInstantLayerIds((current) => {
          if (current.size === 0) return current;
          const next = new Set(current);
          instantIds.forEach((layerId) => next.delete(layerId));
          return next;
        });
      }
    });

    if (snapshotKeys.size > 0) {
      const timer = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((candidate) => candidate !== timer);
        setSnapshots((current) => current.filter((snapshot) => !snapshotKeys.has(snapshot.key)));
      }, transitionMs);
      timersRef.current.push(timer);
    }

    return undefined;
  }, [enabled, programmaticStateKey, transitionMs, visualStateKey]);

  useEffect(() => () => {
    framesRef.current.forEach((frame) => window.cancelAnimationFrame(frame));
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { snapshots, enteringLayerIds, instantLayerIds };
}

function requestAfterNextPaint(
  framesRef: MutableRefObject<number[]>,
  callback: () => void
): number {
  const firstFrame = window.requestAnimationFrame(() => {
    framesRef.current = framesRef.current.filter((candidate) => candidate !== firstFrame);
    const secondFrame = window.requestAnimationFrame(() => {
      framesRef.current = framesRef.current.filter((candidate) => candidate !== secondFrame);
      callback();
    });
    framesRef.current.push(secondFrame);
  });
  framesRef.current.push(firstFrame);
  return firstFrame;
}

function createProgrammaticStateKey(
  layerModels: LayerModel[],
  theme: SquircleTheme
): string {
  return JSON.stringify(layerModels.map(({ layer, prefix, geometry }) => {
    const offset = { x: layer.offset?.x ?? 0, y: layer.offset?.y ?? 0 };
    const hover = layer.hover && typeof layer.hover !== "function"
      ? splitHoverState(layer.hover)
      : null;
    const hoverSignature = hover
      ? {
          visible: hover.visible,
          variant: variantSignature(resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity))
        }
      : typeof layer.hover === "function" ? "resolver" : null;

    return {
      layerId: layer.id,
      prefix,
      geometry: geometrySignatureFor(geometry),
      offset: `${offset.x},${offset.y}`,
      theme,
      visible: baseLayerVisible(layer),
      base: variantSignature(resolveVariant(layer.base, layer.stroke, layer.opacity)),
      hover: hoverSignature
    };
  }));
}

function createProgrammaticVisualState(
  { layer, index, prefix, geometry }: LayerModel,
  hover: RenderHoverConfig | null,
  theme: SquircleTheme
): ProgrammaticLayerVisualState {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  const hoverVariant = hover ? resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity) : null;
  const hasVariantHover = Boolean(hoverVariant && variantSignature(hoverVariant) !== variantSignature(base));
  const baseVisible = baseLayerVisible(layer);
  const hoverVisible = hoverLayerVisible(layer, hover);
  const hasVisibilityHover = hover?.visible !== undefined && hoverVisible !== baseVisible;
  const hoverEnabled = Boolean((hasVariantHover || hasVisibilityHover) && hover?.enabled);
  const variant = hoverEnabled && hasVariantHover && hoverVariant ? hoverVariant : base;
  const visible = hoverEnabled ? hoverVisible : baseVisible;
  const offset = { x: layer.offset?.x ?? 0, y: layer.offset?.y ?? 0 };

  return {
    layerId: layer.id,
    prefix,
    index,
    geometry,
    geometrySignature: geometrySignatureFor(geometry),
    offset,
    offsetSignature: `${offset.x},${offset.y}`,
    theme,
    variant,
    visible,
    signature: `${variantSignature(variant)}|visible:${visible ? 1 : 0}`
  };
}

function canTransitionProgrammaticState(
  previous: ProgrammaticLayerVisualState,
  current: ProgrammaticLayerVisualState
): boolean {
  return previous.layerId === current.layerId
    && previous.prefix === current.prefix
    && previous.geometrySignature === current.geometrySignature
    && previous.offsetSignature === current.offsetSignature
    && previous.theme === current.theme;
}

function canAnimateProgrammaticVisualState(
  previous: ProgrammaticLayerVisualState,
  current: ProgrammaticLayerVisualState
): boolean {
  if (!canTransitionProgrammaticState(previous, current)) return false;
  if (surfaceSignature(previous.variant) === surfaceSignature(current.variant)) return true;
  if (surfaceTransitionShouldSnap(previous.variant, current.variant)) return false;

  const hasComplexSurface = variantHasComplexSurface(previous.variant)
    || variantHasComplexSurface(current.variant);
  return !hasComplexSurface;
}

function isVisibilityOnlyProgrammaticChange(
  previous: ProgrammaticLayerVisualState,
  current: ProgrammaticLayerVisualState
): boolean {
  return variantSignature(previous.variant) === variantSignature(current.variant)
    && previous.visible !== current.visible;
}

function geometrySignatureFor(geometry: ReturnType<typeof createSquircleGeometry>): string {
  const config = geometry.config;
  return [
    geometry.viewBox,
    config.width,
    config.viewBoxHeight,
    config.exponent,
    config.samples,
    config.halfSize,
    config.prismHeight,
    config.angleDegrees,
    config.inlayScale,
    config.center.x,
    config.center.y
  ].join("|");
}

function groupProgrammaticSnapshotsByLayerId(
  snapshots: ProgrammaticLayerSnapshot[]
): Map<string, ProgrammaticLayerSnapshot[]> {
  const grouped = new Map<string, ProgrammaticLayerSnapshot[]>();
  snapshots.forEach((snapshot) => {
    grouped.set(snapshot.layerId, [...(grouped.get(snapshot.layerId) ?? []), snapshot]);
  });
  return grouped;
}

function SquircleDefinitions({
  prefix,
  geometry,
  theme
}: {
  prefix: string;
  geometry: ReturnType<typeof createSquircleGeometry>;
  theme: SquircleTheme;
}) {
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
      {(Object.values(SQUIRCLE_PALETTES) as SquirclePalette[]).map((palette) => {
        const renderPalette = themedPaletteValues(palette, theme);
        const effectColors = paletteEffectColors(renderPalette);

        return (
          <g key={palette.id}>
            <LinearGradient
              id={`${prefix}-top-${palette.id}`}
              x1={geometry.topBounds.minX}
              y1={geometry.topBounds.minY}
              x2={geometry.topBounds.maxX}
              y2={geometry.topBounds.maxY}
              stops={renderPalette.top}
            />
            <LinearGradient
              id={`${prefix}-side-${palette.id}`}
              x1={geometry.sideBounds.minX}
              y1={geometry.sideBounds.minY}
              x2={geometry.sideBounds.maxX}
              y2={geometry.sideBounds.maxY}
              stops={renderPalette.side}
            />
            <LinearGradient
              id={`${prefix}-wire-${palette.id}`}
              x1={geometry.topBounds.minX}
              y1={geometry.topBounds.minY}
              x2={geometry.topBounds.maxX}
              y2={geometry.topBounds.maxY}
              stops={renderPalette.wire}
            />
            <LinearGradient
              id={`${prefix}-text-surface-${palette.id}`}
              x1={-425.63}
              y1={-0.1}
              x2={425.6}
              y2={0.07}
              stops={renderPalette.top}
            />
            <LinearGradient
              id={`${prefix}-text-wire-${palette.id}`}
              x1={-64}
              y1={-24}
              x2={64}
              y2={24}
              stops={renderPalette.textWire}
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
  theme,
  selected,
  entering,
  instant,
  snapshots
}: {
  layer: SquircleLayerConfig;
  hover: RenderHoverConfig | null;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
  theme: SquircleTheme;
  selected: boolean;
  entering: boolean;
  instant: boolean;
  snapshots: ProgrammaticLayerSnapshot[];
}) {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  const hoverVariant = hover ? resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity) : null;
  const hasVariantHover = Boolean(hoverVariant && variantSignature(hoverVariant) !== variantSignature(base));
  const baseVisible = baseLayerVisible(layer);
  const hoverVisible = hoverLayerVisible(layer, hover);
  const hasVisibilityHover = hover?.visible !== undefined && hoverVisible !== baseVisible;
  const hasHover = hasVariantHover || hasVisibilityHover;
  const stableSurfaceHover = Boolean(hasVariantHover && hoverVariant && surfaceSignature(base) === surfaceSignature(hoverVariant));
  const cssHover = Boolean(hasVariantHover && hover?.mode === "css" && baseVisible);
  const controlledHoverEnabled = Boolean(hasHover && hover?.mode === "controlled" && hover.enabled);
  const layerVisible = controlledHoverEnabled ? hoverVisible : baseVisible;
  const canActivateHiddenHover = Boolean(!baseVisible && hover?.visible === true);
  const layerInteractive = baseVisible || layerVisible || canActivateHiddenHover;
  const x = layer.offset?.x ?? 0;
  const y = layer.offset?.y ?? 0;
  const layerStyle = {
    pointerEvents: layerInteractive ? undefined : "none"
  } as CSSProperties;
  const currentStateClassName = [
    entering && layerVisible ? "sq-programmatic-entering" : "",
    layerVisible ? "" : "sq-programmatic-hidden",
    instant ? "sq-programmatic-instant" : ""
  ].filter(Boolean).join(" ");
  const hasAnnotationSnapshot = snapshots.some((snapshot) => snapshot.annotationsOnly);
  const surfaceStateClassName = [
    layerVisible ? "" : "sq-programmatic-hidden",
    instant ? "sq-programmatic-instant" : ""
  ].filter(Boolean).join(" ");
  const currentSurfaceClassName = hasAnnotationSnapshot ? surfaceStateClassName : currentStateClassName;
  const baseSurfaceClassName = [
    stableSurfaceHover ? "sq-surface" : "sq-base sq-surface",
    currentSurfaceClassName
  ].filter(Boolean).join(" ");
  const baseAnnotationClassName = ["sq-base", currentStateClassName].filter(Boolean).join(" ");
  const hoverClassName = ["sq-hover", currentStateClassName].filter(Boolean).join(" ");
  const hoverSurfaceClassName = ["sq-hover", currentSurfaceClassName].filter(Boolean).join(" ");

  return (
    <g
      className={[
        "sq-layer",
        layerInteractive ? "" : "sq-layer-inert",
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
      style={layerStyle}
    >
      {stableSurfaceHover && hoverVariant ? (
        <>
          <SquircleVariant className={baseSurfaceClassName} variant={base} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} theme={theme} annotations={false} />
          <SquircleAnnotations className={baseAnnotationClassName} variant={base} geometry={geometry} prefix={prefix} theme={theme} />
          <SquircleAnnotations className={hoverClassName} variant={hoverVariant} geometry={geometry} prefix={prefix} theme={theme} />
        </>
      ) : hasAnnotationSnapshot ? (
        <>
          <SquircleVariant className={baseSurfaceClassName} variant={base} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} theme={theme} annotations={false} />
          <SquircleAnnotations className={baseAnnotationClassName} variant={base} geometry={geometry} prefix={prefix} theme={theme} />
          {hasVariantHover && hoverVariant ? <SquircleVariant className={hoverSurfaceClassName} variant={hoverVariant} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} theme={theme} /> : null}
        </>
      ) : (
        <>
          <SquircleVariant className={["sq-base", currentSurfaceClassName].filter(Boolean).join(" ")} variant={base} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} theme={theme} />
          {hasVariantHover && hoverVariant ? <SquircleVariant className={hoverSurfaceClassName} variant={hoverVariant} geometry={geometry} prefix={prefix} motionEnabled={motionEnabled} metalBackend={metalBackend} theme={theme} /> : null}
        </>
      )}
      {snapshots.map((snapshot) => {
        const snapshotClassName = [
          "sq-programmatic-snapshot",
          snapshot.exiting ? "sq-programmatic-exiting" : ""
        ].filter(Boolean).join(" ");

        return snapshot.annotationsOnly ? (
          <SquircleAnnotations
            key={snapshot.key}
            className={snapshotClassName}
            variant={snapshot.variant}
            geometry={snapshot.geometry}
            prefix={snapshot.prefix}
            theme={snapshot.theme}
          />
        ) : (
          <SquircleVariant
            key={snapshot.key}
            className={snapshotClassName}
            variant={snapshot.variant}
            geometry={snapshot.geometry}
            prefix={snapshot.prefix}
            motionEnabled={false}
            metalBackend={metalBackend}
            theme={snapshot.theme}
          />
        );
      })}
    </g>
  );
}

type RenderHoverConfig = {
  enabled: boolean;
  mode: "css" | "controlled";
  variant: SquircleVariantConfig;
  visible?: boolean;
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
  controlledObjectHoverLayerIds: Set<string>
): RenderHoverConfig | null {
  if (!layer.hover) return null;
  if (typeof layer.hover !== "function") {
    const hover = splitHoverState(layer.hover);
    const controlledObjectHover = controlledObjectHoverLayerIds.has(layer.id);
    return {
      enabled: controlledObjectHover && hoveredLayerId === layer.id && visible,
      mode: controlledObjectHover ? "controlled" : "css",
      variant: hover.variant,
      visible: hover.visible
    };
  }
  if (!hoveredLayerId) return null;

  const hoveredIndex = layers.findIndex((candidate) => candidate.id === hoveredLayerId);
  const hoveredLayer = hoveredIndex >= 0 ? layers[hoveredIndex] : null;
  if (!hoveredLayer) return null;

  const state = layer.hover({
    layer,
    index,
    layers,
    hoveredLayerId,
    hoveredLayer,
    hoveredIndex
  });
  if (!state) return null;

  const hover = splitHoverState(state);
  return { enabled: visible, mode: "controlled", variant: hover.variant, visible: hover.visible };
}

function createResolvedHoverMap({
  layerModels,
  layers,
  hoverState,
  controlledObjectHoverLayerIds
}: {
  layerModels: LayerModel[];
  layers: SquircleLayerConfig[];
  hoverState: ResolvedHoverState;
  controlledObjectHoverLayerIds: Set<string>;
}): Map<string, RenderHoverConfig | null> {
  return new Map(layerModels.map(({ layer, index }) => [
    layer.id,
    resolveLayerHover(layer, index, layers, hoverState.layerId, hoverState.visible, controlledObjectHoverLayerIds)
  ]));
}

function splitHoverState(state: SquircleLayerHoverState): { variant: SquircleVariantConfig; visible?: boolean } {
  const { visible, ...variant } = state;
  return { variant, visible };
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
  metalBackend,
  theme,
  annotations = true
}: {
  className: string;
  variant: ResolvedVariant;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
  theme: SquircleTheme;
  annotations?: boolean;
}) {
  const palette = getRenderPalette(variant.paletteId, theme);
  const topFill = `url(#${prefix}-top-${palette.id})`;
  const sideFill = `url(#${prefix}-side-${palette.id})`;
  const wireFill = `url(#${prefix}-wire-${palette.id})`;
  const wallPoints = pointsToString(geometry.wallPoints);
  const topPoints = pointsToString(geometry.topPoints);
  const hiddenPoints = pointsToString(geometry.hiddenPoints);
  const topClipId = `${prefix}-top-clip`;
  const glass = variant.material === "glass";

  return (
    <g className={["sq-variant", className, `sq-material-${variant.material}`, glass ? "sq-material-transparent" : ""].filter(Boolean).join(" ")}>
      {variant.material === "wireframe" ? (
        <>
          <polyline
            className="sq-hidden"
            points={hiddenPoints}
            stroke={wireFill}
            strokeWidth={variant.stroke.hidden}
            opacity={variant.stroke.hiddenOpacity}
          />
          <polygon
            className="sq-face sq-wire-side"
            points={wallPoints}
            fill="none"
            stroke={wireFill}
            strokeWidth={variant.stroke.wire}
            strokeOpacity={variant.stroke.wireOpacity}
          />
          <polygon
            className="sq-face sq-wire-top"
            points={topPoints}
            fill="none"
            stroke={wireFill}
            strokeWidth={variant.stroke.wire}
            strokeOpacity={variant.stroke.wireOpacity}
          />
        </>
      ) : (
        <>
          {glass ? (
            <polyline
              className="sq-hidden sq-glass-hidden sq-transparent-hidden"
              points={hiddenPoints}
              stroke={wireFill}
              strokeWidth={glassHiddenWidth(variant)}
              opacity={glassHiddenOpacity(variant)}
            />
          ) : null}
          <polygon
            className={["sq-face sq-solid-side", glass ? "sq-glass-side sq-transparent-side" : ""].filter(Boolean).join(" ")}
            points={wallPoints}
            fill={sideFill}
            fillOpacity={glass ? glassSideOpacity(variant) : 1}
            stroke={glass ? wireFill : palette.sideEdge}
            strokeWidth={glass ? glassEdgeWidth(variant) : variant.stroke.face}
            strokeOpacity={glass ? glassSideEdgeOpacity(variant) : variant.stroke.faceOpacity}
          />
          <SolidTopFace
            variant={variant}
            palette={palette}
            geometry={geometry}
            prefix={prefix}
            topClipId={topClipId}
            topFill={topFill}
            wireFill={wireFill}
            topPoints={topPoints}
            motionEnabled={motionEnabled}
            metalBackend={metalBackend}
          />
        </>
      )}
      {annotations ? <SquircleAnnotationElements variant={variant} palette={palette} geometry={geometry} prefix={prefix} theme={theme} /> : null}
    </g>
  );
}

function SquircleAnnotations({
  className,
  variant,
  geometry,
  prefix,
  theme
}: {
  className: string;
  variant: ResolvedVariant;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  theme: SquircleTheme;
}) {
  const palette = getRenderPalette(variant.paletteId, theme);
  const glass = variant.material === "glass";

  return (
    <g className={["sq-variant sq-annotations", className, `sq-material-${variant.material}`, glass ? "sq-material-transparent" : ""].filter(Boolean).join(" ")}>
      <SquircleAnnotationElements variant={variant} palette={palette} geometry={geometry} prefix={prefix} theme={theme} />
    </g>
  );
}

function SquircleAnnotationElements({
  variant,
  palette,
  geometry,
  prefix,
  theme
}: {
  variant: ResolvedVariant;
  palette: RenderPalette;
  geometry: ReturnType<typeof createSquircleGeometry>;
  prefix: string;
  theme: SquircleTheme;
}) {
  const wireFill = `url(#${prefix}-wire-${palette.id})`;
  const textSurfaceFill = `url(#${prefix}-text-surface-${palette.id})`;
  const textWireFill = `url(#${prefix}-text-wire-${palette.id})`;
  const inlayPoints = pointsToString(geometry.inlayPoints);

  return (
    <>
      {variant.line ? (
        <polygon
          className="sq-line"
          points={inlayPoints}
          stroke={linePaint(variant, palette, wireFill, theme)}
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
          {...textPaintProps(variant, palette, textSurfaceFill, textWireFill, theme)}
        >
          {variant.text}
        </text>
      ) : null}
    </>
  );
}

function SolidTopFace({
  variant,
  palette,
  geometry,
  prefix,
  topClipId,
  topFill,
  wireFill,
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
  wireFill: string;
  topPoints: string;
  motionEnabled: boolean;
  metalBackend: MetalBackend;
}) {
  const glass = variant.material === "glass";
  const fillOpacity = glass ? variant.opacity.transparentFace : 1;
  const effect = variant.material === "wireframe" ? "off" : variant.effect;
  const effectOpacity = glass ? fillOpacity : 1;
  const stroke = glass ? wireFill : palette.topEdge;
  const strokeWidth = glass ? glassEdgeWidth(variant) : variant.stroke.face;
  const strokeOpacity = glass ? glassTopEdgeOpacity(variant) : variant.stroke.faceOpacity;

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
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
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
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
        />
      </>
    );
  }

  return (
    <polygon
      className={["sq-face sq-solid-top", glass ? "sq-glass-top sq-transparent-top" : ""].filter(Boolean).join(" ")}
      points={topPoints}
      fill={topFill}
      fillOpacity={fillOpacity}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
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
  const material = normalizeMaterial(variant.material);

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

function normalizeMaterial(material: SquircleMaterial | undefined): ResolvedMaterial {
  if (material === "solid" || material === "wireframe") return material;
  if (material === "glass" || material === "transparent") return "glass";
  return "wireframe";
}

function resolvePaletteId(paletteId: string | undefined): string {
  return isSquirclePaletteId(paletteId) ? paletteId : DEFAULT_PALETTE_ID;
}

function annotationPaint(color: SquircleAnnotationColor, labelFill: string): string {
  if (color === "white") return ANNOTATION_WHITE;
  if (color === "black") return ANNOTATION_BLACK;
  return labelFill;
}

function linePaint(variant: ResolvedVariant, palette: RenderPalette, wireFill: string, theme: SquircleTheme): string {
  if (variant.material === "wireframe") return wireFill;
  if (variant.material === "glass") return glassAnnotationPaint(variant.lineColor, variant, palette, theme);
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
  if (variant.material === "glass") return variant.opacity.transparentAnnotation;
  return variant.opacity.solidAnnotation;
}

function glassAnnotationPaint(
  color: SquircleAnnotationColor,
  variant: ResolvedVariant,
  palette: RenderPalette,
  theme: SquircleTheme
): string {
  if (color !== "auto") return annotationPaint(color, palette.labelFill);
  return glassAutoAnnotationPaint(variant, palette, theme);
}

function glassAutoAnnotationPaint(variant: ResolvedVariant, palette: RenderPalette, theme: SquircleTheme): string {
  const background = GLASS_BACKGROUND_BY_THEME[theme];
  const topMid = sampleStops(palette.top, 0.5);
  const effectiveTop = blendHex(topMid, background, variant.opacity.transparentFace);
  const blackContrast = contrastRatio(ANNOTATION_BLACK, effectiveTop);
  const whiteContrast = contrastRatio(ANNOTATION_WHITE, effectiveTop);
  return blackContrast >= whiteContrast ? ANNOTATION_BLACK : ANNOTATION_WHITE;
}

function glassSideOpacity(variant: ResolvedVariant): number {
  return clampOpacity(variant.opacity.transparentFace * 0.7);
}

function glassEdgeWidth(variant: ResolvedVariant): number {
  return roundNumber(Math.max(variant.stroke.face * 1.5, variant.stroke.wire * 0.42), 2);
}

function glassTopEdgeOpacity(variant: ResolvedVariant): number {
  return clampOpacity(Math.max(variant.stroke.faceOpacity * 0.86, variant.stroke.wireOpacity * 0.62));
}

function glassSideEdgeOpacity(variant: ResolvedVariant): number {
  return clampOpacity(Math.max(variant.stroke.faceOpacity * 0.62, variant.stroke.wireOpacity * 0.42));
}

function glassHiddenOpacity(variant: ResolvedVariant): number {
  return clampOpacity(Math.min(variant.stroke.hiddenOpacity * 0.65, variant.opacity.transparentFace * 0.7));
}

function glassHiddenWidth(variant: ResolvedVariant): number {
  return roundNumber(variant.stroke.hidden * 0.72, 2);
}

function textPaintProps(
  variant: ResolvedVariant,
  palette: RenderPalette,
  textSurfaceFill: string,
  textWireFill: string,
  theme: SquircleTheme
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

  const paint = variant.material === "glass"
    ? glassAnnotationPaint(variant.textColor, variant, palette, theme)
    : annotationPaint(variant.textColor, palette.labelFill);

  if (variant.textStyle === "wireframe") {
    return {
      fill: "none",
      stroke: paint,
      strokeWidth: variant.stroke.labelWire,
      opacity
    };
  }

  return {
    fill: paint,
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

function surfaceSignature(variant: ResolvedVariant): string {
  return JSON.stringify({
    material: variant.material,
    paletteId: variant.paletteId,
    effect: variant.effect,
    grain: variant.grain,
    stroke: {
      face: variant.stroke.face,
      faceOpacity: variant.stroke.faceOpacity,
      wire: variant.stroke.wire,
      wireOpacity: variant.stroke.wireOpacity,
      hidden: variant.stroke.hidden,
      hiddenOpacity: variant.stroke.hiddenOpacity
    },
    opacity: {
      transparentFace: variant.opacity.transparentFace
    }
  });
}

function variantHasComplexSurface(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe" && (variant.effect !== "off" || variant.grain);
}

function surfaceTransitionShouldSnap(previous: ResolvedVariant, current: ResolvedVariant): boolean {
  return surfaceSignature(previous) !== surfaceSignature(current)
    && (variantHasComplexSurface(previous) || variantHasComplexSurface(current));
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
    const hover = splitHoverState(layer.hover);
    const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
    if (variantHasAnimatedSurface(hoverVariant)) return true;
  }
  return false;
}

function variantHasAnimatedSurface(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe" && variant.effect !== "off";
}

function layerRequiresControlledObjectHover(layer: SquircleLayerConfig, lowerGrainCanBeOccluded = false): boolean {
  if (!layer.hover || typeof layer.hover === "function") return false;

  const hover = splitHoverState(layer.hover);
  if (hover.visible !== undefined && hover.visible !== baseLayerVisible(layer)) return true;

  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
  if (variantSignature(base) === variantSignature(hoverVariant)) return false;

  if (variantHasGrainSurface(base) || variantHasGrainSurface(hoverVariant)) return true;

  return lowerGrainCanBeOccluded && variantOccludesLowerGrain(base) !== variantOccludesLowerGrain(hoverVariant);
}

function layerHasGrainSurface(layer: SquircleLayerConfig): boolean {
  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  if (variantHasGrainSurface(base)) return true;
  if (layer.hover && typeof layer.hover !== "function") {
    const hover = splitHoverState(layer.hover);
    const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
    if (variantHasGrainSurface(hoverVariant)) return true;
  }
  return false;
}

function variantHasGrainSurface(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe" && variant.grain;
}

function getRenderPalette(paletteId: string, theme: SquircleTheme): RenderPalette {
  const palette = getSquirclePalette(paletteId);
  const values = themedPaletteValues(palette, theme);

  return {
    ...values,
    effectColors: paletteEffectColors(values)
  };
}

function themedPaletteValues(palette: SquirclePalette, theme: SquircleTheme): Omit<RenderPalette, "effectColors"> {
  const overrides = theme === "dark" ? palette.dark : undefined;
  const top = overrides?.top ?? palette.top;
  const side = overrides?.side ?? palette.side;

  return {
    id: palette.id,
    labelFill: overrides?.labelFill ?? palette.labelFill,
    topEdge: overrides?.topEdge ?? palette.topEdge,
    sideEdge: overrides?.sideEdge ?? palette.sideEdge,
    top,
    side,
    wire: overrides?.wire ?? palette.wire ?? top,
    textWire: overrides?.textWire ?? palette.textWire
  };
}

function paletteEffectColors(palette: Pick<RenderPalette, "top" | "side" | "sideEdge">): EffectColorSet {
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

function blendHex(foreground: string, background: string, opacity: number): string {
  return mixHex(background, foreground, clampOpacity(opacity));
}

function contrastRatio(colorA: string, colorB: string): number {
  const a = relativeLuminance(colorA);
  const b = relativeLuminance(colorB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  const [r, g, b] = hexToRgb(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
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

function roundNumber(value: number, decimals = 1): number {
  return Number(value.toFixed(decimals));
}

function clampOpacity(value: number): number {
  return Math.max(0, Math.min(1, value));
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
  programmaticSnapshots,
  programmaticEnteringLayerIds,
  programmaticInstantLayerIds,
  sceneViewBox
}: {
  layerModels: LayerModel[];
  hoverMap: Map<string, RenderHoverConfig | null>;
  programmaticSnapshots: ProgrammaticLayerSnapshot[];
  programmaticEnteringLayerIds: Set<string>;
  programmaticInstantLayerIds: Set<string>;
  sceneViewBox: string;
}): GrainOverlayModel[] {
  const viewBox = parseViewBox(sceneViewBox);
  const overlays: GrainOverlayModel[] = [];

  const annotationSnapshotLayerIds = new Set(
    programmaticSnapshots
      .filter((snapshot) => snapshot.annotationsOnly)
      .map((snapshot) => snapshot.layerId)
  );

  layerModels.forEach(({ layer, prefix, geometry }, layerIndex) => {
    const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
    const hover = hoverMap.get(layer.id) ?? null;
    const hoverVariant = hover ? resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity) : null;
    const hasVariantHover = Boolean(hoverVariant && variantSignature(hoverVariant) !== variantSignature(base));
    const hasSurfaceHover = Boolean(hoverVariant && surfaceSignature(hoverVariant) !== surfaceSignature(base));
    const baseVisible = baseLayerVisible(layer);
    const hoverVisible = hoverLayerVisible(layer, hover);
    const hasVisibilityHover = hover?.visible !== undefined && hoverVisible !== baseVisible;
    const hoverEnabled = Boolean((hasVariantHover || hasVisibilityHover) && hover?.enabled);
    const instantProgrammatic = programmaticInstantLayerIds.has(layer.id);
    const baseOpacity = hoverEnabled
      ? (hasSurfaceHover ? 0 : visibilityOpacity(hoverVisible))
      : visibilityOpacity(baseVisible);
    const hoverOpacity = hoverEnabled && hasSurfaceHover ? visibilityOpacity(hoverVisible) : 0;
    const currentOpacity = programmaticEnteringLayerIds.has(layer.id) && !annotationSnapshotLayerIds.has(layer.id) ? 0 : 1;
    const offset = { x: layer.offset?.x ?? 0, y: layer.offset?.y ?? 0 };
    const occlusionPolygons = createHigherLayerOcclusionPolygons(layerModels, layerIndex, hoverMap);

    if (variantHasGrainSurface(base)) {
      overlays.push(createGrainOverlay({
        key: `${prefix}-base`,
        geometry,
        offset,
        occlusionPolygons,
        viewBox,
        opacity: grainOverlayOpacity(base) * baseOpacity * currentOpacity,
        instant: instantProgrammatic
      }));
    }

    if (hasVariantHover && hoverVariant && variantHasGrainSurface(hoverVariant)) {
      overlays.push(createGrainOverlay({
        key: `${prefix}-hover`,
        geometry,
        offset,
        occlusionPolygons,
        viewBox,
        opacity: grainOverlayOpacity(hoverVariant) * hoverOpacity * currentOpacity,
        instant: instantProgrammatic
      }));
    }
  });

  programmaticSnapshots.forEach((snapshot) => {
    if (snapshot.annotationsOnly) return;
    if (!variantHasGrainSurface(snapshot.variant)) return;

    const occlusionPolygons = createHigherLayerOcclusionPolygons(layerModels, snapshot.index, hoverMap);
    overlays.push(createGrainOverlay({
      key: `${snapshot.key}-grain`,
      geometry: snapshot.geometry,
      offset: snapshot.offset,
      occlusionPolygons,
      viewBox,
      opacity: grainOverlayOpacity(snapshot.variant) * (snapshot.exiting ? 0 : visibilityOpacity(snapshot.visible)),
      instant: false
    }));
  });

  return overlays;
}

function visibilityOpacity(visible: boolean): number {
  return visible ? 1 : 0;
}

function createGrainOverlay({
  key,
  geometry,
  offset,
  occlusionPolygons,
  viewBox,
  opacity,
  instant
}: {
  key: string;
  geometry: ReturnType<typeof createSquircleGeometry>;
  offset: SquirclePoint;
  occlusionPolygons: SquirclePoint[][];
  viewBox: ViewBox;
  opacity: number;
  instant: boolean;
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
    instant,
    rect: createGrainOverlayRect(bounds, viewBox),
    clipPoints: createGrainClipPoints(points, bounds),
    occlusionPoints: createGrainOcclusionClipPoints(occlusionPolygons, bounds)
  };
}

function createHigherLayerOcclusionPolygons(
  layerModels: LayerModel[],
  layerIndex: number,
  hoverMap: Map<string, RenderHoverConfig | null>
): SquirclePoint[][] {
  return layerModels.slice(layerIndex + 1).flatMap(({ layer, geometry }) => {
    if (!layerOccludesLowerGrain(layer, hoverMap.get(layer.id) ?? null)) return [];

    const offset = { x: layer.offset?.x ?? 0, y: layer.offset?.y ?? 0 };
    const offsetPoints = (points: SquirclePoint[]) => points.map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y
    }));

    return [
      offsetPoints(geometry.wallPoints),
      offsetPoints(geometry.topPoints)
    ];
  });
}

function layerOccludesLowerGrain(layer: SquircleLayerConfig, hover: RenderHoverConfig | null): boolean {
  if (!effectiveLayerVisible(layer, hover)) return false;

  const base = resolveVariant(layer.base, layer.stroke, layer.opacity);
  if (!hover?.enabled) return variantOccludesLowerGrain(base);

  const hoverVariant = resolveVariant({ ...layer.base, ...hover.variant }, layer.stroke, layer.opacity);
  return variantOccludesLowerGrain(hoverVariant);
}

function variantOccludesLowerGrain(variant: ResolvedVariant): boolean {
  return variant.material !== "wireframe";
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

function createGrainOcclusionClipPoints(polygons: SquirclePoint[][], bounds: GrainOverlayBounds): string[] {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return polygons.flatMap((polygon) => {
    const unitPolygon = polygon.map((point) => ({
      x: (point.x - bounds.minX) / width,
      y: (point.y - bounds.minY) / height
    }));
    const clipped = clipPolygonToUnitBox(unitPolygon);
    if (clipped.length < 3) return [];

    return [clipped.map((point) => [
      roundUnit(point.x),
      roundUnit(point.y)
    ].join(",")).join(" ")];
  });
}

function clipPolygonToUnitBox(points: SquirclePoint[]): SquirclePoint[] {
  return [
    (input: SquirclePoint[]) => clipPolygon(input, (point) => point.x >= 0, (a, b) => intersectAtX(a, b, 0)),
    (input: SquirclePoint[]) => clipPolygon(input, (point) => point.x <= 1, (a, b) => intersectAtX(a, b, 1)),
    (input: SquirclePoint[]) => clipPolygon(input, (point) => point.y >= 0, (a, b) => intersectAtY(a, b, 0)),
    (input: SquirclePoint[]) => clipPolygon(input, (point) => point.y <= 1, (a, b) => intersectAtY(a, b, 1))
  ].reduce((polygon, clip) => (polygon.length >= 3 ? clip(polygon) : []), points);
}

function clipPolygon(
  points: SquirclePoint[],
  isInside: (point: SquirclePoint) => boolean,
  intersect: (start: SquirclePoint, end: SquirclePoint) => SquirclePoint
): SquirclePoint[] {
  const clipped: SquirclePoint[] = [];
  if (points.length === 0) return clipped;

  let previous = points[points.length - 1] as SquirclePoint;
  let previousInside = isInside(previous);

  points.forEach((current) => {
    const currentInside = isInside(current);

    if (currentInside) {
      if (!previousInside) clipped.push(intersect(previous, current));
      clipped.push(current);
    } else if (previousInside) {
      clipped.push(intersect(previous, current));
    }

    previous = current;
    previousInside = currentInside;
  });

  return clipped;
}

function intersectAtX(start: SquirclePoint, end: SquirclePoint, x: number): SquirclePoint {
  const dx = end.x - start.x;
  if (Math.abs(dx) < 0.00001) return { x, y: start.y };
  const amount = (x - start.x) / dx;
  return {
    x,
    y: start.y + (end.y - start.y) * amount
  };
}

function intersectAtY(start: SquirclePoint, end: SquirclePoint, y: number): SquirclePoint {
  const dy = end.y - start.y;
  if (Math.abs(dy) < 0.00001) return { x: start.x, y };
  const amount = (y - start.y) / dy;
  return {
    x: start.x + (end.x - start.x) * amount,
    y
  };
}

function grainOverlayOpacity(variant: ResolvedVariant): number {
  if (!variantHasGrainSurface(variant)) return 0;
  if (variant.material === "glass") return GRAIN_OPACITY * variant.opacity.transparentFace;
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
        {visibleOverlays.filter((overlay) => overlay.occlusionPoints.length > 0).map((overlay) => (
          <mask
            key={`${overlay.key}-mask`}
            id={`${prefix}-grain-mask-${overlay.key}`}
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
            x="0"
            y="0"
            width="1"
            height="1"
          >
            <rect x="0" y="0" width="1" height="1" fill="#ffffff" />
            {overlay.occlusionPoints.map((points, index) => (
              <polygon key={`${overlay.key}-mask-${index}`} points={points} fill="#000000" />
            ))}
          </mask>
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
            className={overlay.instant ? "sq-grain-instant" : undefined}
            x="0"
            y="0"
            width="100%"
            height="100%"
            clipPath={`url(#${prefix}-grain-clip-${overlay.key})`}
            filter={`url(#${filterId})`}
            mask={overlay.occlusionPoints.length > 0 ? `url(#${prefix}-grain-mask-${overlay.key})` : undefined}
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
