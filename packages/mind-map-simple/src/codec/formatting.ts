import { readMindMapStyle, type MindMapNodeStyle } from "@quirekit/mind-map";

/** The admitted formatting projection; no arbitrary vendor style fields escape. */
const fields = { fontSize: "fontSize", bold: "fontWeight", color: "color", fill: "fillColor", borderColor: "borderColor",
  borderWidth: "borderWidth", shape: "shape", lineColor: "lineColor", lineWidth: "lineWidth", linePattern: "lineDasharray", lineStyle: "lineStyle" } as const;
export const simpleStyleKeys = Object.freeze([...Object.values(fields), "borderRadius"]);

/** @param style - Canonical explicit fields. @returns Pinned vendor data without theme defaults. */
export function toSimpleStyle(style: MindMapNodeStyle | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(style ?? {})) {
    const key = name as keyof MindMapNodeStyle;
    result[fields[key]] = key === "bold" ? (value ? "bold" : "normal")
      : key === "shape" && value === "rounded" ? "roundedRectangle"
      : key === "linePattern" ? (value === "dashed" ? "6,4" : "none")
      : key === "lineStyle" && value === "elbow" ? "straight" : value;
  }
  if (style?.shape === "rectangle") result.borderRadius = 0;
  return result;
}

/** @param data - Private vendor data. @returns Canonical explicit formatting, or no overrides. */
export function fromSimpleStyle(data: Record<string, unknown>): MindMapNodeStyle | undefined {
  if (Object.hasOwn(data, "borderRadius") && (data.borderRadius !== 0 || data.shape !== "rectangle")) {
    throw new TypeError("Unsupported explicit border radius");
  }
  const result: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(fields)) {
    if (!Object.hasOwn(data, key)) continue;
    const value = data[key];
    if (name === "bold" && !["bold", "normal"].includes(value as string)) throw new TypeError("Unsupported font weight");
    if (name === "linePattern" && !["none", "6,4"].includes(value as string)) throw new TypeError("Unsupported line pattern");
    result[name] = name === "bold" ? value === "bold"
      : name === "shape" && value === "roundedRectangle" ? "rounded"
      : name === "linePattern" ? (value === "6,4" ? "dashed" : "solid")
      : name === "lineStyle" && value === "straight" ? "elbow" : value;
  }
  return Object.keys(result).length ? readMindMapStyle(result) : undefined;
}
