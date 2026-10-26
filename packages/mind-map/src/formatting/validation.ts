import { readRecord } from "../model/validation";
import type { MindMapNodeStyle, MindMapStylePatch } from "./types";

/** Admitted fields in stable serialization order. */
export const mindMapStyleKeys = ["fontSize", "bold", "color", "fill", "borderColor", "borderWidth", "shape",
  "lineColor", "lineWidth", "linePattern", "lineStyle"] as const;

/** @param key - Admitted property. @param value - Untrusted explicit value. @returns Validated normalized scalar. */
function scalar(key: typeof mindMapStyleKeys[number], value: unknown): string | number | boolean {
  if (["color", "fill", "borderColor", "lineColor"].includes(key)) {
    if (key === "fill" && value === "transparent") return value;
    if (typeof value === "string" && /^#[\da-f]{6}$/iu.test(value)) return value.toLowerCase();
  } else if (key === "bold") { if (typeof value === "boolean") return value; }
  else if (key === "fontSize") { if (Number.isInteger(value) && (value as number) >= 8 && (value as number) <= 72) return value as number; }
  else if (key === "borderWidth" || key === "lineWidth") {
    if (typeof value === "number" && Number.isFinite(value) && value >= (key === "lineWidth" ? 0.5 : 0) && value <= 8) return value;
  } else {
    const allowed = key === "shape" ? ["rectangle", "rounded", "ellipse", "diamond"]
      : key === "linePattern" ? ["solid", "dashed"] : ["curve", "elbow", "direct"];
    if (typeof value === "string" && allowed.includes(value)) return value;
  }
  throw new TypeError(`node.style.${key}: unsupported value`);
}

/** @param input - Untrusted style/patch object. @param patch - Whether null may clear a field. @returns Frozen explicit properties. */
function read(input: unknown, patch: boolean): MindMapStylePatch {
  const record = readRecord(input, mindMapStyleKeys, "node.style"), result: Record<string, unknown> = {};
  for (const key of mindMapStyleKeys) {
    if (Object.hasOwn(record, key)) result[key] = patch && record[key] === null ? null : scalar(key, record[key]);
  }
  return Object.freeze(result);
}

/** @param input - Persistent style. @returns Strict and detached canonical properties. */
export function readMindMapStyle(input: unknown): MindMapNodeStyle { return read(input, false) as MindMapNodeStyle; }
/** @param input - Command patch. @returns Strict property updates, including clear intents. */
export function readMindMapStylePatch(input: unknown): MindMapStylePatch { return read(input, true); }
