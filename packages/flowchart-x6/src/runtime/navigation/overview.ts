import { bindFlowLocale } from "../locale/controls";
import { flowRuntimeText } from "../locale/messages";
import type { Cell } from "@antv/x6";
import { flowchartNodeBounds } from "@quirekit/flowchart";
import type { FlowchartWorldBounds } from "../../navigation/types";
import type { FlowRuntime, FlowTextInput } from "../types";
import { readNode } from "../../codec/read";
import { requireIdle } from "../commands";
import { OverviewBoundsIndex } from "./bounds";

/** @param runtime - World geometry and viewport owner. @param text - Native input guard. @param mount - Consumer-owned overview surface. @returns Cleanup of the incremental outline and all listeners. */
export function mountOverview(runtime: FlowRuntime, text: FlowTextInput, mount: HTMLElement): () => void {
  const { graph } = runtime, owner = mount.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const svg = owner.createElementNS(ns, "svg"), layer = owner.createElementNS(ns, "g"), viewport = owner.createElementNS(ns, "rect"), rectangles = new Map<string, SVGRectElement>();
  svg.setAttribute("role", "button"); svg.setAttribute("tabindex", "0");
  const unbindLocale = bindFlowLocale(runtime, () => svg.setAttribute("aria-label", flowRuntimeText(runtime.locale, "缩略图定位画布，方向键平移，回车居中")));
  Object.assign(svg.style, { display: "block", width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" });
  svg.append(layer, viewport); mount.append(svg);
  viewport.setAttribute("data-overview-viewport", ""); viewport.setAttribute("fill", "currentColor"); viewport.setAttribute("fill-opacity", "0.08"); viewport.setAttribute("stroke", "currentColor"); viewport.setAttribute("stroke-width", "1.5"); viewport.setAttribute("vector-effect", "non-scaling-stroke"); viewport.setAttribute("pointer-events", "none");
  const entries = graph.getNodes().map(n => [n.id, flowchartNodeBounds(readNode(n))] as const), index = new OverviewBoundsIndex(entries);
  /** @param rectangle - SVG world rectangle. @param bounds - World coordinates, without source viewport transforms. */
  function write(rectangle: SVGRectElement, bounds: FlowchartWorldBounds): void { for (const key of ["x", "y", "width", "height"] as const) rectangle.setAttribute(key, String(bounds[key])); }
  /** @param id - Node identity. @param bounds - Current rotated world bounds. */
  function node(id: string, bounds: FlowchartWorldBounds): void {
    let rectangle = rectangles.get(id);
    if (!rectangle) {
      rectangle = owner.createElementNS(ns, "rect"); rectangle.setAttribute("data-overview-node", id); rectangle.setAttribute("fill", "currentColor"); rectangle.setAttribute("fill-opacity", "0.2"); rectangle.setAttribute("stroke", "currentColor"); rectangle.setAttribute("stroke-opacity", "0.55"); rectangle.setAttribute("stroke-width", "0.75"); rectangle.setAttribute("vector-effect", "non-scaling-stroke"); layer.append(rectangle); rectangles.set(id, rectangle);
    }
    write(rectangle, bounds);
  }
  /** Updates only the viewport rectangle; pan/zoom never rereads node source or unions. */
  function view(): void { write(viewport, graph.getGraphArea() as FlowchartWorldBounds); }
  /** Reads the constant-time root union; SVG preserves the diagram aspect ratio. */
  function extent(): void {
    const b = index.bounds() ?? { x: -100, y: -100, width: 200, height: 200 }, pad = Math.max(24, Math.max(b.width, b.height) * 0.04);
    svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${Math.max(1, b.width) + pad * 2} ${Math.max(1, b.height) + pad * 2}`);
  }
  entries.forEach(([id, b]) => node(id, b)); extent(); view();
  /** @param event - Single canonical geometry mutation; unrelated derived presentation is ignored. */
  function changed({ cell, key, options }: { cell: Cell; key: string; options: { qkDerived?: boolean } }): void {
    if (options.qkDerived || !cell.isNode() || !["position", "size", "angle", "data"].includes(key)) return;
    const bounds = flowchartNodeBounds(readNode(cell)); index.set(cell.id, bounds); node(cell.id, bounds);
    if (runtime.dragging || !graph.model.hasActiveBatch()) extent();
  }
  /** @param event - Newly admitted node. */
  function added({ cell }: { cell: Cell }): void {
    if (!cell.isNode()) return;
    const bounds = flowchartNodeBounds(readNode(cell)); index.set(cell.id, bounds); node(cell.id, bounds); if (!graph.model.hasActiveBatch()) extent();
  }
  /** @param event - Removed identity. */
  function removed({ cell }: { cell: Cell }): void { if (rectangles.has(cell.id)) { rectangles.get(cell.id)!.remove(); rectangles.delete(cell.id); index.remove(cell.id); if (!graph.model.hasActiveBatch()) extent(); } }
  /** @param point - Requested world center. */
  function center(point: { x: number; y: number }): void { try { requireIdle(runtime, text); graph.centerPoint(point.x, point.y); } catch (error) { runtime.fail(error); } }
  /** @param event - Real click, converted by the SVG matrix including letterboxing. */
  function click(event: MouseEvent): void {
    if (event.button !== 0) return;
    const matrix = svg.getScreenCTM(); if (!matrix) return;
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    center(p.matrixTransform(matrix.inverse())); svg.focus({ preventScroll: true });
  }
  /** @param event - Equivalent bounded keyboard navigation in world units. */
  function key(event: KeyboardEvent): void {
    if (event.isComposing || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); const v = graph.getGraphArea() as FlowchartWorldBounds, b = index.bounds() ?? v;
    if (event.key === "Enter" || event.key === " ") center({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
    else center({ x: v.x + v.width / 2 + (event.key === "ArrowLeft" ? -v.width / 4 : event.key === "ArrowRight" ? v.width / 4 : 0), y: v.y + v.height / 2 + (event.key === "ArrowUp" ? -v.height / 4 : event.key === "ArrowDown" ? v.height / 4 : 0) });
  }
  svg.addEventListener("click", click); svg.addEventListener("keydown", key);
  graph.on("cell:change:*", changed); graph.on("cell:added", added); graph.on("cell:removed", removed); graph.on("batch:stop", extent);
  graph.on("scale", view); graph.on("translate", view); graph.on("resize", view);
  return () => {
    unbindLocale();
    graph.off("cell:change:*", changed); graph.off("cell:added", added); graph.off("cell:removed", removed); graph.off("batch:stop", extent);
    graph.off("scale", view); graph.off("translate", view); graph.off("resize", view);
    svg.removeEventListener("click", click); svg.removeEventListener("keydown", key); rectangles.clear(); svg.remove();
  };
}
