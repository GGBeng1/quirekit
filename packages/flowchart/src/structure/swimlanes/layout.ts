import type { FlowchartDocument, FlowchartNode, FlowchartPoint, FlowchartTerminal } from "../../model/types";
import { fitSequenceContainers } from "../containers";

/** @param document - Valid source. @param id - Selected lane. @returns Same-owner, same-direction siblings sorted by position. */
export function laneGroup(document: FlowchartDocument, id: string): FlowchartNode[] {
  const lane = document.nodes.find(node => node.id === id);
  if (!lane || (lane.shape !== "lane-horizontal" && lane.shape !== "lane-vertical")) throw new TypeError("请选择一条泳道");
  const axis = lane.shape === "lane-horizontal" ? "y" : "x";
  return document.nodes.filter(node => node.shape === lane.shape && node.parent === lane.parent).sort((a, b) => a[axis] - b[axis]);
}
/** @param node - Potential descendant. @param roots - Lane identities. @param nodes - Source lookup. @returns Nearest owning lane, if any. */
export function owningLane(node: FlowchartNode, roots: ReadonlySet<string>, nodes: ReadonlyMap<string, FlowchartNode>): string | undefined {
  let current: FlowchartNode | undefined = node;
  while (current) { if (roots.has(current.id)) return current.id; current = current.parent ? nodes.get(current.parent) : undefined; }
  return undefined;
}
/** @param document - Updated source. @param lanes - Same-direction sibling lanes. @returns Phase annotations spanning the current group. */
export function fitPhases(document: FlowchartDocument, lanes: readonly FlowchartNode[]): FlowchartDocument {
  if (!lanes.length || !lanes[0]!.parent) return document;
  const horizontal = lanes[0]!.shape === "lane-horizontal", left = Math.min(...lanes.map(n => n.x)), top = Math.min(...lanes.map(n => n.y));
  const right = Math.max(...lanes.map(n => n.x + n.width)), bottom = Math.max(...lanes.map(n => n.y + n.height));
  return { ...document, nodes: document.nodes.map(node => node.parent !== lanes[0]!.parent ? node
    : horizontal && node.shape === "phase-vertical" ? { ...node, y: top, height: bottom - top }
      : !horizontal && node.shape === "phase-horizontal" ? { ...node, x: left, width: right - left } : node) };
}
/** @param document - Source containing all retained/new nodes. @param lanes - Requested sibling order and sizes. @param origin - Original group top-left. @returns Contiguous lanes with descendants and wholly internal bends translated once. */
export function reflowLanes(document: FlowchartDocument, lanes: readonly FlowchartNode[], origin: FlowchartPoint): FlowchartDocument {
  if (!lanes.length) return document;
  const horizontal = lanes[0]!.shape === "lane-horizontal", old = new Map(document.nodes.map(n => [n.id, n]));
  const roots = new Set(lanes.map(n => n.id)), delta = new Map<string, FlowchartPoint>(), placed = new Map<string, FlowchartNode>();
  let offset = horizontal ? origin.y : origin.x;
  for (const lane of lanes) {
    const node = { ...lane, x: horizontal ? origin.x : offset, y: horizontal ? offset : origin.y }, previous = old.get(lane.id)!;
    delta.set(lane.id, { x: node.x - previous.x, y: node.y - previous.y }); placed.set(lane.id, node);
    offset += horizontal ? node.height : node.width;
  }
  const movement = new Map<string, FlowchartPoint>();
  const nodes = document.nodes.map(node => {
    const owner = owningLane(node, roots, old), move = owner ? delta.get(owner)! : undefined;
    if (!move) return node;
    movement.set(node.id, move);
    return placed.get(node.id) ?? { ...node, x: node.x + move.x, y: node.y + move.y };
  });
  /** @param terminal - Attached or free endpoint. @returns Its owning lane translation, if any. */
  function translation(terminal: FlowchartTerminal): FlowchartPoint | undefined { return "node" in terminal ? movement.get(terminal.node) : undefined; }
  // Cross-lane user bends stay in world coordinates. Only a connection whose
  // two endpoints share a translation follows its lane as one rigid object.
  const edges = document.edges.map(edge => {
    const a = translation(edge.source), b = translation(edge.target);
    return a && b && a.x === b.x && a.y === b.y ? { ...edge, vertices: edge.vertices.map(p => ({ x: p.x + a.x, y: p.y + a.y })) } : edge;
  });
  return fitSequenceContainers(fitPhases({ ...document, nodes, edges }, [...placed.values()]), roots);
}
