import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";
import { polygonGeometry } from "./polygon";

/** @param node - Portable dimensions. @param base - Base local geometry. @returns Directional block arrow geometry, with a caption inside its shaft. */
export function arrowGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">, base: ShapeGeometry): ShapeGeometry | undefined {
  const { shape, width: w, height: h } = node;
  if (!shape.startsWith("arrow-")) return undefined;
  const double = shape === "arrow-horizontal" || shape === "arrow-vertical";
  const vertical = ["arrow-up", "arrow-down", "arrow-vertical"].includes(shape);
  const points: readonly (readonly [number, number])[] = double
    ? [[0, 0.5], [0.25, 0], [0.25, 0.28], [0.75, 0.28], [0.75, 0], [1, 0.5], [0.75, 1], [0.75, 0.72], [0.25, 0.72], [0.25, 1]]
    : [[0, 0.28], [0.65, 0.28], [0.65, 0], [1, 0.5], [0.65, 1], [0.65, 0.72], [0, 0.72]];
  const transformed = points.map(([x, y]): readonly [number, number] => shape === "arrow-left" ? [1 - x, y] : shape === "arrow-up" ? [y, 1 - x] : vertical ? [y, x] : [x, y]);
  const center = double ? 0.5 : 0.35;
  return polygonGeometry(transformed, w, h, { ...base, textWidth: w * (vertical ? 0.34 : double ? 0.44 : 0.54), textHeight: h * (vertical ? double ? 0.44 : 0.54 : 0.3),
    textX: w * (vertical ? 0.5 : shape === "arrow-left" ? 1 - center : center), textY: h * (vertical ? shape === "arrow-up" ? 1 - center : center : 0.5) });
}
