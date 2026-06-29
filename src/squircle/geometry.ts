import type { SquircleGeometryConfig, SquircleLayerConfig, SquircleMaterial, SquirclePoint } from "./types";

export const DEFAULT_GEOMETRY = {
  width: 800,
  viewBoxHeight: 480,
  exponent: 12,
  samples: 160,
  prismHeight: 10,
  angleDegrees: 20,
  inlayScale: 0.6
} as const;

interface SampledPoint extends SquirclePoint {
  nx: number;
  ny: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SquircleGeometry {
  config: Required<Omit<SquircleGeometryConfig, "halfSize" | "center">> & {
    halfSize: number;
    center: SquirclePoint;
  };
  cosA: number;
  sinA: number;
  topPoints: SquirclePoint[];
  bottomPoints: SquirclePoint[];
  wallPoints: SquirclePoint[];
  hiddenPoints: SquirclePoint[];
  inlayPoints: SquirclePoint[];
  labelTransform: string;
  topBounds: Bounds;
  sideBounds: Bounds;
  viewBox: string;
}

export function createSquircleGeometry(input: SquircleGeometryConfig = {}): SquircleGeometry {
  const exponent = input.exponent ?? DEFAULT_GEOMETRY.exponent;
  const samples = input.samples ?? DEFAULT_GEOMETRY.samples;
  const width = input.width ?? DEFAULT_GEOMETRY.width;
  const viewBoxHeight = input.viewBoxHeight ?? DEFAULT_GEOMETRY.viewBoxHeight;
  const prismHeight = input.prismHeight ?? DEFAULT_GEOMETRY.prismHeight;
  const angleDegrees = input.angleDegrees ?? DEFAULT_GEOMETRY.angleDegrees;
  const inlayScale = input.inlayScale ?? DEFAULT_GEOMETRY.inlayScale;
  const angle = (angleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const unit = sampleSuperellipse(1, exponent, samples);
  const unitScreenX = unit.map((point) => (point.x - point.y) * cosA);
  const unitWidth = Math.max(...unitScreenX) - Math.min(...unitScreenX);
  const halfSize = input.halfSize ?? width / unitWidth;
  const rawPoints = sampleSuperellipse(halfSize, exponent, samples);
  const rawScreenX = rawPoints.map((point) => (point.x - point.y) * cosA);
  const rawScreenY = rawPoints.map((point) => (point.x + point.y) * sinA);
  const center = input.center ?? {
    x: -Math.min(...rawScreenX),
    y: prismHeight - Math.min(...rawScreenY)
  };

  const topPoints = rawPoints.map((point) => project(point, prismHeight, center, cosA, sinA));
  const bottomPoints = rawPoints.map((point) => project(point, 0, center, cosA, sinA));
  const frontRun = longestCircularRun(rawPoints.map((point) => point.nx + point.ny >= 0));
  const backRun = complementRun(frontRun, samples);
  const wallTop = collectCircular(topPoints, frontRun);
  const wallBottom = collectCircular(bottomPoints, frontRun).reverse();
  const wallPoints = [...wallTop, ...wallBottom];
  const hiddenPoints = collectCircular(bottomPoints, backRun);
  const inlayPoints = sampleSuperellipse(halfSize * inlayScale, exponent, samples).map((point) =>
    project(point, prismHeight, center, cosA, sinA)
  );
  const topBounds = boundsFor(topPoints);
  const sideBounds = boundsFor([...topPoints, ...wallPoints]);

  return {
    config: {
      width,
      viewBoxHeight,
      exponent,
      samples,
      prismHeight,
      angleDegrees,
      inlayScale,
      halfSize,
      center
    },
    cosA,
    sinA,
    topPoints,
    bottomPoints,
    wallPoints,
    hiddenPoints,
    inlayPoints,
    labelTransform: `matrix(${round(cosA)},${round(sinA)},${round(-cosA)},${round(sinA)},${round(center.x)},${round(center.y - prismHeight)})`,
    topBounds,
    sideBounds,
    viewBox: `0 0 ${round(width)} ${round(viewBoxHeight)}`
  };
}

export function pointsToString(points: SquirclePoint[]): string {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
}

export function createSquircleLayers(
  count: number,
  options: {
    gap?: number;
    paletteId?: string;
    material?: SquircleMaterial;
  } = {}
): SquircleLayerConfig[] {
  const gap = options.gap ?? 88;
  const material = options.material ?? "wireframe";
  const paletteId = options.paletteId ?? "15";

  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: `layer-${index + 1}`,
    visible: true,
    offset: { x: 0, y: (count - index - 1) * gap },
    base: { material, paletteId, text: false, line: false },
    hover: undefined
  }));
}

export function reflowLayerOffsets(layers: SquircleLayerConfig[], gap = 88): SquircleLayerConfig[] {
  const count = layers.length;
  return layers.map((layer, index) => ({
    ...layer,
    offset: { x: layer.offset?.x ?? 0, y: (count - index - 1) * gap }
  }));
}

function sampleSuperellipse(halfSize: number, exponent: number, samples: number): SampledPoint[] {
  return Array.from({ length: samples }, (_, index) => {
    const t = (2 * Math.PI * index) / samples;
    const c = Math.cos(t);
    const s = Math.sin(t);
    return {
      x: halfSize * signedPower(c, 2 / exponent),
      y: halfSize * signedPower(s, 2 / exponent),
      nx: signedPower(c, (2 * (exponent - 1)) / exponent),
      ny: signedPower(s, (2 * (exponent - 1)) / exponent)
    };
  });
}

function signedPower(value: number, power: number): number {
  return Math.sign(value) * Math.pow(Math.abs(value), power);
}

function project(point: SquirclePoint, z: number, center: SquirclePoint, cosA: number, sinA: number): SquirclePoint {
  return {
    x: center.x + (point.x - point.y) * cosA,
    y: center.y + (point.x + point.y) * sinA - z
  };
}

function longestCircularRun(flags: boolean[]): { start: number; length: number } {
  const doubled = [...flags, ...flags];
  let best = { start: 0, length: 0 };
  let currentStart = 0;
  let currentLength = 0;

  doubled.forEach((flag, index) => {
    if (flag) {
      if (currentLength === 0) currentStart = index;
      currentLength += 1;
      if (currentLength > best.length && currentLength <= flags.length) {
        best = { start: currentStart % flags.length, length: currentLength };
      }
    } else {
      currentLength = 0;
    }
  });

  return best.length > 0 ? best : { start: 0, length: flags.length };
}

function complementRun(run: { start: number; length: number }, total: number): { start: number; length: number } {
  return {
    start: (run.start + run.length) % total,
    length: Math.max(0, total - run.length)
  };
}

function collectCircular<T>(items: T[], run: { start: number; length: number }): T[] {
  return Array.from({ length: run.length }, (_, index) => items[(run.start + index) % items.length]);
}

function boundsFor(points: SquirclePoint[]): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function round(value: number): string {
  return Number(value.toFixed(2)).toString();
}
