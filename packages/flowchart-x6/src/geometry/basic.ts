import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";
import { polygonGeometry } from "./polygon";

/** @param node - Portable shape dimensions. @param base - Rectangular defaults. @returns Extended basic or annotation geometry, when owned by this module. */
export function basicGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">, base: ShapeGeometry): ShapeGeometry | undefined {
  const { shape, width: w, height: h } = node;
  /** @param points - Normalized contour. @param caption - Caption overrides. @returns Scaled shape. */
  const polygon = (points: readonly (readonly [number, number])[], caption: Partial<ShapeGeometry> = {}) => polygonGeometry(points, w, h, { ...base, ...caption });
  if (shape === "pentagon") return polygon([[0.5, 0], [1, 0.38], [0.81, 1], [0.19, 1], [0, 0.38]], { textWidth: w * 0.6, textHeight: h * 0.42, textY: h * 0.6 });
  if (shape === "octagon") return polygon([[0.3, 0], [0.7, 0], [1, 0.3], [1, 0.7], [0.7, 1], [0.3, 1], [0, 0.7], [0, 0.3]], { textWidth: w * 0.68, textHeight: h * 0.6 });
  if (shape === "trapezoid") return polygon([[0.2, 0], [0.8, 0], [1, 1], [0, 1]], { textWidth: w * 0.55 });
  if (shape === "right-triangle") return polygon([[0, 0], [1, 1], [0, 1]], { textWidth: w * 0.32, textHeight: h * 0.23, textX: w * 0.25, textY: h * 0.76 });
  if (shape === "star") {
    const points = Array.from({ length: 10 }, (_, i): readonly [number, number] => {
      const angle = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.22 : 0.5;
      return [0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)];
    });
    return polygon(points, { textWidth: w * 0.33, textHeight: h * 0.22, textY: h * 0.53 });
  }
  if (shape === "plus") return polygon([[0.33, 0], [0.67, 0], [0.67, 0.33], [1, 0.33], [1, 0.67], [0.67, 0.67], [0.67, 1], [0.33, 1], [0.33, 0.67], [0, 0.67], [0, 0.33], [0.33, 0.33]], { textWidth: w * 0.7, textHeight: h * 0.23 });
  if (shape === "text") return { ...base, visible: false, textWidth: Math.max(8, w - 8), textHeight: Math.max(8, h - 8) };
  if (shape === "callout") return polygon([[0, 0], [1, 0], [1, 0.75], [0.45, 0.75], [0.25, 1], [0.25, 0.75], [0, 0.75]], { textHeight: h * 0.55, textY: h * 0.375 });
  return undefined;
}
