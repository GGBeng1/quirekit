import { modelingGeometry } from "./modeling";
import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";
import { architectureGeometry } from "./architecture";
import { baseGeometry } from "./base";
import { basicGeometry } from "./basic";
import { flowGeometry } from "./flow";
import { arrowGeometry } from "./arrows";
import { structureGeometry } from "./structure";

/** @param node - Source shape and dimensions in local pixels. @returns Exact contour, caption area and attachment geometry without mounting a graph. */
export function shapeGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height" | "uml">): ShapeGeometry {
  const base = baseGeometry(node);
  return modelingGeometry(node, base) ?? structureGeometry(node, base) ?? architectureGeometry(node, base) ?? basicGeometry(node, base) ?? flowGeometry(node, base) ?? arrowGeometry(node, base) ?? base;
}
