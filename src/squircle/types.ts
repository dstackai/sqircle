export type SquircleMaterial = "solid" | "transparent" | "wireframe";
export type SquircleAnnotationColor = "contrast" | "auto" | "white" | "black";
export type SquircleTextStyle = "solid" | "wireframe";
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

export interface SquircleStrokeConfig {
  face: number;
  faceOpacity: number;
  wire: number;
  wireOpacity: number;
  hidden: number;
  hiddenOpacity: number;
  dash: number;
  wireDash: number;
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
  text?: string | boolean;
  dash?: boolean;
  textStyle?: SquircleTextStyle;
  textColor?: SquircleAnnotationColor;
  textSize?: number;
  textFontFamily?: string;
  textFontWeight?: string | number;
  dashColor?: SquircleAnnotationColor;
  stroke?: Partial<SquircleStrokeConfig>;
  opacity?: Partial<SquircleOpacityConfig>;
}

export interface SquircleLayerConfig {
  id: string;
  visible?: boolean;
  offset?: Partial<SquirclePoint>;
  base: SquircleVariantConfig;
  hover?: SquircleVariantConfig;
  stroke?: Partial<SquircleStrokeConfig>;
  opacity?: Partial<SquircleOpacityConfig>;
  className?: string;
}

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
  onLayerSelect?: (layerId: string) => void;
}
