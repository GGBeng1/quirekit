import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";

/** @param node - Local dimensions. @param base - Rectangular contour. @returns A title-safe entity geometry, or no override. */
export function modelingGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height" | "uml">, base: ShapeGeometry): ShapeGeometry | undefined {
  if (node.shape !== "er-entity" && node.shape !== "uml-class") return undefined;
  const header = Math.min(40, node.height / 3);
  return { ...base, detail: `M0 ${header} H${node.width}${node.shape === "uml-class" ? ` M0 ${classDivider(node)} H${node.width}` : ""}`, textY: header / 2, textHeight: Math.max(1, header - 8) };
}

/** @param node - Class dimensions and optional members (palette has no data). @returns Local attribute/operation divider shared by paths and text projection. */
export function classDivider(node: Pick<FlowchartNode, "height" | "uml">): number {
  const top = Math.min(40, node.height / 3), attributes = Math.max(1, node.uml?.attributes.length ?? 0), operations = Math.max(1, node.uml?.operations.length ?? 0);
  const padding = Math.min(12, (node.height - top) / 2);
  return top + padding + Math.max(0, node.height - top - 2 * padding) * attributes / (attributes + operations);
}
