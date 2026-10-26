import { readMindMapStyle } from "../../formatting/validation";
import type { MindMapNodeStyle } from "../../formatting/types";
import type { XmindContext } from "../types";
import { reportXmind, reportXmindFields, xmindRecord } from "../reading";

const colors = { "fo:color": "color", "svg:fill": "fill", "border-line-color": "borderColor", "line-color": "lineColor" } as const;
const lengths = { "fo:font-size": "fontSize", "border-line-width": "borderWidth", "line-width": "lineWidth" } as const;
const enums = {
  "shape-class": { "org.xmind.topicShape.rect": "rectangle", "org.xmind.topicShape.roundedRect": "rounded", "org.xmind.topicShape.ellipse": "ellipse", "org.xmind.topicShape.diamond": "diamond" },
  "line-class": { "org.xmind.branchConnection.curve": "curve", "org.xmind.branchConnection.roundedElbow": "elbow", "org.xmind.branchConnection.elbow": "elbow", "org.xmind.branchConnection.straight": "direct" },
  "line-pattern": { solid: "solid", dash: "dashed", dashed: "dashed" },
} as const;

/** @param value - Source CSS length. @returns CSS pixels, or undefined for an unrecognized unit. */
function pixels(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const match = /^(\d+(?:\.\d+)?)(pt|px)?$/u.exec(value.trim());
  return match ? Number(match[1]) * (match[2] === "pt" ? 4 / 3 : 1) : undefined;
}

/** @param input - XMind style component. @param path - Exact source location. @param context - Difference budget. @returns Admitted explicit properties. */
export function readXmindStyle(input: unknown, path: string, context: XmindContext): MindMapNodeStyle {
  if (input === undefined) return {};
  if (typeof input !== "object" || !input || Array.isArray(input)) {
    reportXmind(context, "unsupported-field", path, "Unresolved style reference."); return {};
  }
  const style = xmindRecord(input, path);
  reportXmindFields(style, ["id", "styleId", "type", "properties"], path, context);
  const properties = style.properties === undefined ? {} : xmindRecord(style.properties, `${path}.properties`), result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    let target: string | undefined, next: unknown;
    if (Object.hasOwn(colors, key)) { target = colors[key as keyof typeof colors]; next = value === "none" && target === "fill" ? "transparent" : value; }
    else if (Object.hasOwn(lengths, key)) {
      target = lengths[key as keyof typeof lengths]; next = pixels(value);
      if (target === "fontSize" && typeof next === "number" && next !== Math.round(next)) {
        reportXmind(context, "fallback", `${path}.properties.${key}`, "Font size rounded to an integral CSS pixel."); next = Math.round(next);
      }
    } else if (key === "fo:font-weight") {
      target = "bold";
      next = value === "bold" || (typeof value === "number" && value >= 600) || (typeof value === "string" && /^[6-9]00$/u.test(value)) ? true : value === "normal" || (typeof value === "string" && /^[1-5]00$/u.test(value)) || (typeof value === "number" && [100, 200, 300, 400, 500].includes(value)) ? false : undefined;
    } else if (Object.hasOwn(enums, key)) {
      target = key === "shape-class" ? "shape" : key === "line-class" ? "lineStyle" : "linePattern";
      next = typeof value === "string" ? (enums[key as keyof typeof enums] as Record<string, string>)[value] : undefined;
    }
    if (target && next !== undefined) {
      try { Object.assign(result, readMindMapStyle({ [target]: next })); continue; } catch { /* Report unsupported value without partially admitting it. */ }
    }
    reportXmind(context, "unsupported-field", `${path}.properties.${key}`, "This style property or value cannot be represented.");
  }
  return readMindMapStyle(result);
}

/** @param input - Canvas theme. @param path - Source location. @param context - Difference budget. @returns Styles mapped once per role. */
export function readXmindTheme(input: unknown, path: string, context: XmindContext): ReadonlyMap<string, MindMapNodeStyle> {
  const theme = input === undefined ? {} : xmindRecord(input, path), result = new Map<string, MindMapNodeStyle>();
  for (const [role, style] of Object.entries(theme)) result.set(role, readXmindStyle(style, `${path}.${role}`, context));
  return result;
}
