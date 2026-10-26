import type { FlowchartNode, FlowchartPoint } from "@quirekit/flowchart";
import { shapeGeometry } from "../../geometry/shapes";
import type { FlowRuntime } from "../types";

/** @param runtime - Graph coordinate owner. @param node - Uncommitted shape geometry. @returns A transient placement outline with no graph cells or history. */
export function createPlacementPreview(runtime: FlowRuntime, node: FlowchartNode) {
  const document = runtime.mount.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"), geometry = shapeGeometry(node);
  svg.dataset.flowPlacementPreview = "true"; svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", `0 0 ${node.width} ${node.height}`);
  svg.style.cssText = "position:absolute;pointer-events:none;overflow:visible;opacity:.65;z-index:10";
  for (const [index, path] of [geometry.outline, geometry.detail].entries()) {
    if (!path) continue;
    const element = document.createElementNS(ns, "path"); element.setAttribute("d", path);
    element.setAttribute("fill", index === 0 ? runtime.appearance.surface : "none");
    element.setAttribute("stroke", runtime.appearance.primary); element.setAttribute("stroke-width", "2");
    element.setAttribute("vector-effect", "non-scaling-stroke"); svg.append(element);
  }
  runtime.mount.append(svg);
  return {
    /** @param point - Client-space pointer. @returns World-space top-left only while the pointer is over this canvas. */
    update(point: FlowchartPoint): FlowchartPoint | null {
      const bounds = runtime.mount.getBoundingClientRect();
      const inside = point.x >= bounds.left && point.x < bounds.right && point.y >= bounds.top && point.y < bounds.bottom;
      svg.style.display = inside ? "block" : "none";
      if (!inside) return null;
      // X6 alone owns viewport translation/scale. Overlay offsets are relative
      // to the clipping mount; the canonical result stays in world units.
      const center = runtime.graph.clientToLocal(point.x, point.y);
      const position = { x: center.x - node.width / 2, y: center.y - node.height / 2 };
      const client = runtime.graph.localToClient(position), scale = runtime.graph.zoom();
      Object.assign(svg.style, { left: `${client.x - bounds.left}px`, top: `${client.y - bounds.top}px`, width: `${node.width * scale}px`, height: `${node.height * scale}px` });
      return position;
    },
    /** Removes the transient outline. */ destroy() { svg.remove(); },
  };
}
