import type { MouseEvent as ReactMouseEvent } from "react";

export type SquircleMaterial = "solid" | "transparent" | "wireframe";
export type SquircleAnnotationColor = "auto" | "white" | "black";
export type SquircleTextStyle = "solid" | "wireframe";
export type SquircleLineStyle = "solid" | "dotted" | "dashed";
export type SquircleEffect = "off" | "metal";
export type SquircleTheme = "light" | "dark";

export interface SquirclePoint {
  x: number;
  y: number;
}

export interface SquircleGeometryConfig {
  width?: number;
  viewBoxHeight?: number;
  exponent?: number;
  samples?: number;
  halfSize?: number;
  prismHeight?: number;
  angleDegrees?: number;
  inlayScale?: number;
  center?: SquirclePoint;
}

export type SquircleLayerGeometryConfig = Pick<SquircleGeometryConfig, "exponent" | "prismHeight" | "inlayScale">;

export interface SquircleStrokeConfig {
  face: number;
  faceOpacity: number;
  wire: number;
  wireOpacity: number;
  hidden: number;
  hiddenOpacity: number;
  line: number;
  wireLine: number;
  labelWire: number;
}

export interface SquircleOpacityConfig {
  transparentFace: number;
  transparentAnnotation: number;
  solidAnnotation: number;
}

export interface SquircleVariantConfig {
  material?: SquircleMaterial;
  paletteId?: string;
  effect?: SquircleEffect;
  text?: string | false;
  line?: SquircleLineStyle | false;
  textStyle?: SquircleTextStyle;
  textColor?: SquircleAnnotationColor;
  textSize?: number;
  textFontFamily?: string;
  textFontWeight?: string | number;
  lineColor?: SquircleAnnotationColor;
  stroke?: Partial<SquircleStrokeConfig>;
  opacity?: Partial<SquircleOpacityConfig>;
}

export interface SquircleLayerHoverContext {
  layer: SquircleLayerConfig;
  index: number;
  layers: SquircleLayerConfig[];
  hoveredLayerId: string;
  hoveredLayer: SquircleLayerConfig;
  hoveredIndex: number;
}

export type SquircleLayerHoverResolver = (context: SquircleLayerHoverContext) => SquircleVariantConfig | false | null | undefined;
export type SquircleLayerHoverConfig = SquircleVariantConfig | SquircleLayerHoverResolver;

export interface SquircleLayerConfig {
  id: string;
  visible?: boolean;
  offset?: Partial<SquirclePoint>;
  geometry?: SquircleLayerGeometryConfig;
  base: SquircleVariantConfig;
  hover?: SquircleLayerHoverConfig;
  stroke?: Partial<SquircleStrokeConfig>;
  opacity?: Partial<SquircleOpacityConfig>;
  className?: string;
}

export interface SquircleLayerClickEvent {
  layerId: string;
  layer: SquircleLayerConfig;
  index: number;
  layerElement: SVGGElement;
  event: ReactMouseEvent<SVGSVGElement>;
}

export type SquircleLayerClickEventHandler = (event: SquircleLayerClickEvent) => void;

export interface SquircleSceneProps {
  layers: SquircleLayerConfig[];
  geometry?: SquircleGeometryConfig;
  selectedLayerId?: string | null;
  theme?: SquircleTheme;
  idPrefix?: string;
  className?: string;
  ariaLabel?: string;
  fitToLayers?: boolean;
  transitionMs?: number;
  onLayerClick?: SquircleLayerClickEventHandler;
}
