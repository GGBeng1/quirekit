import { readText } from "../model/validation";
import type { MindMapLayout, MindMapPoint } from "../model/types";
import type { XmindContext, XmindDiagnostic } from "./types";

/** @param input - External object. @param path - Diagnostic path. @returns A plain record containing data properties only. */
export function xmindRecord(input: unknown, path: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || ![null, Object.prototype].includes(Object.getPrototypeOf(input))) throw new TypeError(`${path}: expected object`);
  const keys = Reflect.ownKeys(input);
  if (keys.length > 1000) throw new RangeError(`${path}: field budget exceeded`);
  for (const key of keys) {
    if (typeof key !== "string" || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key)!, "value")) {
      throw new TypeError(`${path}: expected data property`);
    }
  }
  return input as Record<string, unknown>;
}

/** @param input - Source list. @param path - Diagnostic path. @returns A bounded ordered array. */
export function xmindArray(input: unknown, path: string): unknown[] {
  if (!Array.isArray(input) || input.length > 10000) throw new TypeError(`${path}: expected bounded array`);
  for (let i = 0; i < input.length; i++) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(input, String(i)) ?? {}, "value")) throw new TypeError(`${path}: expected dense data array`);
  return input;
}

/** @param context - Workbook budget. @param code - Difference type. @param path - Field path. @param message - Explanation. */
export function reportXmind(context: XmindContext, code: XmindDiagnostic["code"], path: string, message: string): void {
  if (context.diagnostics.length < 1000) context.diagnostics.push(Object.freeze({ code, path, message }));
  else if (context.diagnostics.length === 1000) context.diagnostics.push(Object.freeze({
    code: "diagnostics-truncated", path: "sheets", message: "More conversion differences exist; only the first 1000 are listed.",
  }));
}

/** @param record - Source record. @param admitted - Consumed or explicitly inert keys. @param path - Field location. @param context - Workbook diagnostics. */
export function reportXmindFields(record: Record<string, unknown>, admitted: readonly string[], path: string, context: XmindContext): void {
  for (const key of Object.keys(record)) {
    if (!admitted.includes(key)) reportXmind(context, "unsupported-field", `${path}.${key}`, "This field is not represented in the portable mind map.");
  }
}

/** @param value - XMind structure class. @param path - Field location. @param context - Workbook diagnostics. @returns An admitted automatic layout. */
export function xmindLayout(value: unknown, path: string, context: XmindContext): MindMapLayout {
  if (value === undefined || value === "org.xmind.ui.map.unbalanced" || value === "org.xmind.ui.map.balanced") return "mind-map";
  if (value === "org.xmind.ui.logic.left") return "logical-left";
  if (value === "org.xmind.ui.logic.right") return "logical-right";
  if (value === "org.xmind.ui.org-chart.down") return "organization";
  if (value === "org.xmind.ui.timeline.horizontal") return "timeline";
  reportXmind(context, "fallback", path, "Unsupported layout; using the mind-map layout.");
  return "mind-map";
}

/** @param value - Source point. @param path - Field location. @param context - Workbook diagnostics. @returns A finite source coordinate. */
export function xmindPosition(value: unknown, path: string, context: XmindContext): MindMapPoint {
  const point = xmindRecord(value, path);
  reportXmindFields(point, ["x", "y"], path, context);
  if (![point.x, point.y].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10000000)) {
    throw new TypeError(`${path}: expected finite coordinates`);
  }
  return { x: point.x as number, y: point.y as number };
}

/** @param value - Title candidate. @param path - Field location. @param context - Workbook budget. @returns Exact literal topic title. */
export function xmindText(value: unknown, path: string, context: XmindContext): string {
  const text = readText(value, path);
  if ((context.textSize += text.length) > 1000000) throw new RangeError("XMind: text budget exceeded");
  return text;
}
