import type {
  SquircleGeometryConfig,
  SquircleLayerConfig,
  SquircleLayerHoverConfig,
  SquircleLayerHoverState,
  SquircleMaterial,
  SquircleTheme,
  SquircleVariantConfig
} from "./types";

export interface SquircleReactCodeOptions {
  layers: SquircleLayerConfig[];
  theme: SquircleTheme;
  geometry?: SquircleGeometryConfig;
  componentName?: string;
  importPath?: string;
  styleImportPath?: string | false;
  ariaLabel?: string;
}

export function createSquircleReactCode({
  layers,
  theme,
  geometry,
  componentName = "CustomSquircle",
  importPath = "./squircle",
  styleImportPath,
  ariaLabel
}: SquircleReactCodeOptions): string {
  const normalizedName = toComponentName(componentName);
  const normalizedImportPath = JSON.stringify(importPath);
  const normalizedStyleImportPath = styleImportPathFor(importPath, styleImportPath);
  const normalizedAriaLabel = JSON.stringify(ariaLabel ?? `${normalizedName} composition`);
  const layersCode = JSON.stringify(layers.map(layerForReactCode), null, 2);
  const geometryCode = geometry ? JSON.stringify(pruneUndefined(geometry), null, 2) : null;
  const typeImports = geometryCode
    ? "type SquircleGeometryConfig, type SquircleLayerConfig, type SquircleTheme"
    : "type SquircleLayerConfig, type SquircleTheme";

  return [
    `import { SquircleScene, ${typeImports} } from ${normalizedImportPath};`,
    ...(normalizedStyleImportPath ? [`import ${JSON.stringify(normalizedStyleImportPath)};`] : []),
    "",
    `const theme: SquircleTheme = ${JSON.stringify(theme)};`,
    ...(geometryCode ? ["", `const geometry: SquircleGeometryConfig = ${geometryCode};`] : []),
    "",
    `const layers: SquircleLayerConfig[] = ${layersCode};`,
    "",
    `export function ${normalizedName}() {`,
    "  return (",
    "    <SquircleScene",
    "      theme={theme}",
    "      layers={layers}",
    ...(geometryCode ? ["      geometry={geometry}"] : []),
    `      ariaLabel={${normalizedAriaLabel}}`,
    "    />",
    "  );",
    "}",
    ""
  ].join("\n");
}

function styleImportPathFor(importPath: string, styleImportPath: string | false | undefined): string | null {
  if (styleImportPath === false) return null;
  if (typeof styleImportPath === "string") return styleImportPath;
  if (importPath === "@dstackai/sqircle") return "@dstackai/sqircle/style.css";
  return null;
}

function layerForReactCode(layer: SquircleLayerConfig): SquircleLayerConfig {
  return pruneUndefined({
    ...layer,
    base: variantForReactCode(layer.base),
    hover: hoverForReactCode(layer.hover)
  });
}

function hoverForReactCode(hover: SquircleLayerHoverConfig | undefined): SquircleLayerHoverState | undefined {
  if (!hover || typeof hover === "function") return undefined;
  return variantForReactCode(hover);
}

function variantForReactCode<T extends SquircleVariantConfig>(variant: T): T {
  const text = textForExport(variant.text);
  const material = materialForExport(variant.material);

  return pruneUndefined({
    ...variant,
    material,
    text
  });
}

function materialForExport(material: SquircleMaterial | undefined): SquircleMaterial | undefined {
  if (material === "transparent") return "glass";
  return material;
}

function textForExport(text: SquircleVariantConfig["text"]): SquircleVariantConfig["text"] | undefined {
  if (typeof text === "string") return text;
  if (text === false) return false;
  return undefined;
}

function pruneUndefined<T extends object>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

export function toComponentName(input: string): string {
  const words = input
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const name = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  const candidate = name || "CustomSquircle";

  return /^[A-Za-z_$]/.test(candidate) ? candidate : `Squircle${candidate}`;
}
