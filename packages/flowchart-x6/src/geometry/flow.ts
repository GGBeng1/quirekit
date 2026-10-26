import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";
import { baseGeometry } from "./base";
import { polygonGeometry } from "./polygon";

/** @param node - Portable dimensions. @param base - Rectangular defaults. @returns Extended flow notation geometry, when owned by this module. */
export function flowGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">, base: ShapeGeometry): ShapeGeometry | undefined {
  const { shape, width: w, height: h } = node;
  if (shape === "manual-operation") return polygonGeometry([[0, 0], [1, 0], [0.8, 1], [0.2, 1]], w, h, { ...base, textWidth: w * 0.55 });
  if (shape === "merge") return polygonGeometry([[0, 0], [1, 0], [0.5, 1]], w, h, { ...base, textWidth: w * 0.45, textHeight: h * 0.27, textY: h * 0.28 });
  if (shape === "sort") return { ...baseGeometry({ ...node, shape: "decision" }), detail: `M0 ${h / 2} H${w}`, textY: h * 0.3, textWidth: w * 0.28, textHeight: h * 0.2 };
  if (shape === "internal-storage") return { ...base, detail: `M${w * 0.15} 0 V${h} M0 ${h * 0.2} H${w}`, textX: w * 0.575, textY: h * 0.6, textWidth: w * 0.65, textHeight: h * 0.6 };
  if (shape === "stored-data") return { ...base,
    outline: `M${w * 0.16} 0 H${w} C${w * 0.78} 0 ${w * 0.78} ${h} ${w} ${h} H${w * 0.16} C${-w * 0.16 / 3} ${h} ${-w * 0.16 / 3} 0 ${w * 0.16} 0 Z`,
    ports: { ...base.ports, left: { x: 0, y: h / 2 }, right: { x: w * 0.835, y: h / 2 } }, textX: w * 0.45, textWidth: w * 0.58 };
  if (shape === "multi-document") {
    // The wave's cubic x coordinates are evenly spaced over the front sheet.
    // Evaluate y at the center-axis crossing, not at the visual bounding box.
    const t = 1 - 0.5 / 0.84, bottom = h * (0.85 + 1.05 * t * (1 - t) * (2 * t - 1));
    return { ...base,
    outline: `M${w * 0.16} 0 H${w} V${h * 0.68} L${w * 0.92} ${h * 0.75} V${h * 0.78} L${w * 0.84} ${h * 0.85} C${w * 0.56} ${h * 0.5} ${w * 0.28} ${h * 1.2} 0 ${h * 0.85} V${h * 0.16} H${w * 0.08} V${h * 0.08} H${w * 0.16} Z`,
    detail: `M${w * 0.08} ${h * 0.08} H${w * 0.92} V${h * 0.75} M${w * 0.08} ${h * 0.16} H${w * 0.84} V${h * 0.85}`,
    ports: { ...base.ports, bottom: { x: w / 2, y: bottom } }, textWidth: w * 0.62, textHeight: h * 0.42, textX: w * 0.42, textY: h * 0.46 };
  }
  if (shape === "summing-junction" || shape === "or-junction") {
    const circle = baseGeometry({ ...node, shape: "circle" }), r = Math.min(w, h) / 2, x = w / 2, y = h / 2, d = r / Math.sqrt(2);
    return { ...circle, detail: shape === "or-junction" ? `M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}` : `M${x - d} ${y - d} L${x + d} ${y + d} M${x - d} ${y + d} L${x + d} ${y - d}`,
      textX: shape === "or-junction" ? x + r * 0.44 : x, textY: y + r * (shape === "or-junction" ? 0.44 : 0.54), textWidth: r * (shape === "or-junction" ? 0.55 : 0.72), textHeight: r * 0.34 };
  }
  return undefined;
}
