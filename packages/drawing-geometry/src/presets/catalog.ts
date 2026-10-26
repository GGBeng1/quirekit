import { presetDefinitions } from "./definitions";
import type { DrawingPresetName } from "./types";

/** @param value - Untrusted identity. @returns Whether the standard defines this preset. */
export function isDrawingPreset(value: unknown): value is DrawingPresetName {
  return typeof value === "string" && Object.hasOwn(presetDefinitions, value);
}

/** @param preset - Standard geometry identity. @returns Whether the shape is a line or an endpoint-based connector. */
export function isLineDrawingPreset(preset: DrawingPresetName): boolean {
  return preset === "line" || preset === "lineInv" || preset === "straightConnector1"
    || /^(?:bent|curved)Connector[2-5]$/.test(preset);
}

/**
 * Validates explicit constant adjustments without replacing authored values.
 * @param preset - Known preset identity.
 * @param value - Untrusted optional adjustment map.
 * @returns A copied map or undefined for unsupported names and values.
 */
export function readDrawingAdjustments(preset: DrawingPresetName, value: unknown): Readonly<Record<string, number>> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const allowed = new Set(presetDefinitions[preset].adjustments.map(([name]) => name));
  const result: Record<string, number> = {};
  for (const [name, number] of Object.entries(value)) {
    if (!allowed.has(name) || typeof number !== "number" || !Number.isFinite(number)
      || number < -2147483648 || number > 2147483647) return undefined;
    result[name] = number;
  }
  return result;
}

/** @param preset - Known preset identity. @returns Whether creation uses an unfilled line without text. */
export function isOpenDrawingPreset(preset: DrawingPresetName): boolean {
  // The standard line definitions inherit fill=norm despite having zero area.
  return preset === "line" || preset === "lineInv"
    || presetDefinitions[preset].paths.every(path => path.fill === "none");
}
