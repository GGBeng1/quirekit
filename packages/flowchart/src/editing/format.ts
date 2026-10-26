import type { FlowchartDocument, FlowchartEdgeStyle, FlowchartNodeStyle } from "../model/types";
import type { FlowchartFormat } from "./types";
import { readStyle } from "../model/styles";
import { record, choice } from "../model/validation";
import { assertFlowchartUnlocked } from "../objects/selection";

/** @param input - Public format payload. @returns Detached strict appearance without unknown content fields. */
function checkedFormat(input: FlowchartFormat): FlowchartFormat {
  const value = record(input, ["kind", "style", "routing", "connector", "crossing"], "format");
  if (value.kind === "node") {
    record(value, ["kind", "style"], "format");
    return Object.freeze({ kind: "node", style: readStyle(value.style, false) as FlowchartNodeStyle });
  }
  if (value.kind !== "edge") throw new Error("不支持的格式类型");
  const connector = value.connector === undefined ? undefined : choice(value.connector, ["sharp", "rounded", "smooth"], "connector");
  const crossing = value.crossing === undefined ? undefined : choice(value.crossing, ["none", "jump", "gap"], "crossing");
  if (connector === "smooth" && crossing && crossing !== "none") throw new Error("曲线不支持交叉处理");
  return Object.freeze({ kind: "edge", style: readStyle(value.style, true) as FlowchartEdgeStyle,
    routing: choice(value.routing, ["straight", "orthogonal"], "routing"), ...(connector ? { connector } : {}), ...(crossing ? { crossing } : {}) });
}
/** @param left - Flat canonical style. @param right - Candidate style. @returns Equality independent of input field ordering. */
function sameStyle(left: FlowchartNodeStyle | FlowchartEdgeStyle, right: FlowchartNodeStyle | FlowchartEdgeStyle): boolean {
  return JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());
}
/** @param document - Admitted graph or selection closure. @param id - Single source. @returns Detached presentation, without geometry, text or identity. */
export function copyFlowchartFormat(document: FlowchartDocument, id: string): FlowchartFormat {
  const node = document.nodes.find(n => n.id === id);
  if (node) return checkedFormat({ kind: "node", style: node.style });
  const edge = document.edges.find(e => e.id === id);
  if (!edge) throw new Error("请选择一个图形或一条连线");
  return checkedFormat({ kind: "edge", style: edge.style, routing: edge.routing,
    ...(edge.connector ? { connector: edge.connector } : {}), ...(edge.crossing ? { crossing: edge.crossing } : {}) });
}
/** @param document - Admitted source or closed fragment. @param ids - Exact direct targets. @param input - Compatible copied appearance. @returns Atomic edit with complete style replacement and untouched semantic content. */
export function applyFlowchartFormat(document: FlowchartDocument, ids: readonly string[], input: FlowchartFormat): FlowchartDocument {
  const format = checkedFormat(input), selected = new Set(ids), family = format.kind === "node" ? document.nodes : document.edges;
  if (!selected.size || family.filter(c => selected.has(c.id)).length !== selected.size) throw new Error("格式只能应用到同类型对象");
  assertFlowchartUnlocked(document, ids);
  let changed = false;
  const nodes = format.kind === "node" ? document.nodes.map(node => {
    if (!selected.has(node.id) || sameStyle(node.style, format.style)) return node;
    changed = true; return { ...node, style: format.style };
  }) : document.nodes;
  const edges = format.kind === "edge" ? document.edges.map(edge => {
    if (!selected.has(edge.id)) return edge;
    const { connector: _connector, crossing: _crossing, ...content } = edge;
    const next = { ...content, style: format.style, routing: format.routing,
      ...(format.connector ? { connector: format.connector } : {}), ...(format.crossing ? { crossing: format.crossing } : {}) };
    if (sameStyle(edge.style, format.style) && edge.routing === format.routing && edge.connector === format.connector && edge.crossing === format.crossing) return edge;
    changed = true; return next;
  }) : document.edges;
  return changed ? { ...document, nodes, edges } : document;
}
