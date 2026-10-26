import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartEdge, FlowchartNode, FlowchartPort } from "../model/types";

/**
 * Gives the forward branches of one node their own sides, so their paths and labels separate.
 *
 * Connections leaving a node without ports all start from the same side and share a trunk, which
 * stacks branch labels such as "yes / no" on top of each other. Only the connections named in
 * `ids` that have no port, anchor or manual bend are changed, and only when their node has two or
 * more of them leading forward along the layout direction.
 *
 * @param graph - Laid-out graph.
 * @param ids - Connections the edit created or reconnected.
 * @param direction - Layout direction the graph follows.
 * @returns Graph whose branch connections are attached to distinct sides.
 */
export function spreadFlowchartBranches(graph: FlowchartDocument, ids: ReadonlySet<string>, direction: "down" | "right"): FlowchartDocument {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const groups = new Map<string, { edge: FlowchartEdge; target: FlowchartNode }[]>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.id) || edge.vertices.length || !free(edge.source) || !free(edge.target)) continue;
    const source = nodes.get(edge.source.node), target = nodes.get(edge.target.node);
    if (!source || !target || source === target || !ahead(source, target, direction)) continue;
    groups.set(source.id, [...groups.get(source.id) ?? [], { edge, target }]);
  }
  const ports = new Map<string, { source: FlowchartPort; target: FlowchartPort }>();
  for (const [id, branches] of groups) {
    if (branches.length < 2) continue;
    const source = nodes.get(id)!;
    for (const { edge, target } of branches) ports.set(edge.id, sides(source, target, direction));
  }
  if (!ports.size) return graph;
  return readFlowchart({ ...graph, edges: graph.edges.map(edge => {
    const side = ports.get(edge.id);
    return side && "node" in edge.source && "node" in edge.target
      ? { ...edge, source: { node: edge.source.node, port: side.source }, target: { node: edge.target.node, port: side.target } }
      : edge;
  }) });
}

/** @param terminal - Connection end. @returns Whether it is attached to a node by its outline only. */
function free(terminal: FlowchartEdge["source"]): terminal is { readonly node: string } {
  return "node" in terminal && terminal.port === undefined && terminal.anchor === undefined;
}

/** @param source - Branching node. @param target - Branch end. @param direction - Layout direction. @returns Whether the target lies past the source. */
function ahead(source: FlowchartNode, target: FlowchartNode, direction: "down" | "right"): boolean {
  return direction === "down" ? target.y >= source.y + source.height : target.x >= source.x + source.width;
}

/**
 * Branches to the side leave from that side; the one straight ahead keeps the leading side.
 *
 * @param source - Branching node.
 * @param target - Branch end.
 * @param direction - Layout direction.
 * @returns Source and target sides.
 */
function sides(source: FlowchartNode, target: FlowchartNode, direction: "down" | "right"): { source: FlowchartPort; target: FlowchartPort } {
  const down = direction === "down";
  const offset = down ? (target.x + target.width / 2) - (source.x + source.width / 2) : (target.y + target.height / 2) - (source.y + source.height / 2);
  const tolerance = (down ? source.width : source.height) / 4;
  if (Math.abs(offset) <= tolerance) return down ? { source: "bottom", target: "top" } : { source: "right", target: "left" };
  if (down) return { source: offset < 0 ? "left" : "right", target: "top" };
  return { source: offset < 0 ? "top" : "bottom", target: "left" };
}
