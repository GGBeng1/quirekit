import type { Graph, EdgeView, routerPresets } from "@antv/x6";
import type { FlowchartPort } from "@quirekit/flowchart";
import { selfLoopGuides, terminalDirection } from "./geometry";

/** @param view - Current native route. @param kind - Attachment end. @returns Cardinal port normal after mirroring/rotation, or no constraint. */
function direction(view: EdgeView, kind: "source" | "target"): FlowchartPort | undefined {
  const terminal = kind === "source" ? view.cell.getSource() : view.cell.getTarget();
  const cell = kind === "source" ? view.cell.getSourceCell() : view.cell.getTargetCell();
  if (!cell?.isNode()) return undefined;
  const anchor = "anchor" in terminal && typeof terminal.anchor === "object" ? terminal.anchor.args : undefined;
  const xAnchor = anchor && "x" in anchor ? anchor.x : undefined, yAnchor = anchor && "y" in anchor ? anchor.y : undefined;
  const side = terminalDirection({ node: cell.id,
    ...("port" in terminal && terminal.port ? { port: terminal.port as FlowchartPort } : typeof xAnchor === "number" && typeof yAnchor === "number" ? { anchor: { x: xAnchor, y: yAnchor } } : {}),
  });
  if (!["top", "right", "bottom", "left"].includes(String(side))) return undefined;
  const source = cell.getData()?.source, radians = cell.getAngle() * Math.PI / 180;
  const dx = (side === "left" ? -1 : side === "right" ? 1 : 0) * (source?.flipX ? -1 : 1);
  const dy = (side === "top" ? -1 : side === "bottom" ? 1 : 0) * (source?.flipY ? -1 : 1);
  const x = dx * Math.cos(radians) - dy * Math.sin(radians), y = dx * Math.sin(radians) + dy * Math.cos(radians);
  return Math.abs(x) >= Math.abs(y) ? x >= 0 ? "right" : "left" : y >= 0 ? "bottom" : "top";
}
/** @param GraphClass - Public lazy constructor. @param presets - Public native routers. Registers a bounded delegation with portable bends kept separate. */
export function registerFlowRouting(GraphClass: typeof Graph, presets: typeof routerPresets): void {
  /** @param vertices - Authoritative manual bends. @param options - Private router options. @param view - World endpoint geometry. @returns Native automatic route, independent of canonical vertices. */
  GraphClass.registerRouter("quirekit-flow-manhattan", (vertices, options, view) => {
    const start = direction(view, "source"), end = direction(view, "target");
    const self = view.cell.getSourceCellId() && view.cell.getSourceCellId() === view.cell.getTargetCellId();
    const guides = self && !vertices.length ? selfLoopGuides(view.sourceBBox, view.sourceAnchor, view.targetAnchor, start, end) : vertices;
    return presets.manhattan.call(view, guides, { ...options, padding: { top: 8, right: 8, bottom: 8, left: 8 }, maxLoopCount: 2000,
      startDirections: start ? [start] : ["top", "right", "bottom", "left"], endDirections: end ? [end] : ["top", "right", "bottom", "left"],
      excludeShapes: ["qk-flow-container", "qk-flow-lifeline"], fallbackRouter: presets.orth }, view);
  }, true);
}
