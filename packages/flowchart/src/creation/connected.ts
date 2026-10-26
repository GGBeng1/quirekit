import type { FlowchartDocument } from "../model/types";
import { createFlowchartNode } from "../model/create";
import { readFlowchart } from "../model/document";
import { choice, record } from "../model/validation";
import { flowchartShapes } from "../model/shapes";
import { assertFlowchartUnlocked } from "../objects/selection";
import { canReplaceFlowchartShape } from "../editing/shapes";
import { directionAnchor, placeConnectedNode } from "./placement";
import type { FlowchartQuickCreate, FlowchartDirection } from "./types";

/** @param document - Valid canonical graph. @param id - One ordinary source node. @param options - Direction and shape. @param nodeId - Fresh node identity. @param edgeId - Fresh connector identity. @returns Valid graph with one connected node, ready for a single history transaction. */
export function addConnectedFlowchartNode(document: FlowchartDocument, id: string, options: FlowchartQuickCreate, nodeId: string, edgeId: string): FlowchartDocument {
  const input = record(options, ["direction", "shape"], "quick-create"), direction = choice(input.direction, ["right", "down", "left", "up"], "direction");
  const shape = choice(input.shape, ["same", ...flowchartShapes], "shape"), source = document.nodes.find(n => n.id === id);
  if (!source || !canReplaceFlowchartShape(source.shape) || document.nodes.some(n => n.parent === source.id)) throw new Error("请选择一个普通图形");
  if (shape !== "same" && !canReplaceFlowchartShape(shape)) throw new Error("请选择普通图形类型");
  if (document.nodes.length + document.edges.length > 9998) throw new RangeError("图形数量已达上限");
  assertFlowchartUnlocked(document, [id]);
  const initial = createFlowchartNode(nodeId, shape === "same" ? source.shape : shape, { x: 0, y: 0 }, "新图形");
  const styled = { ...initial, ...(shape === "same" ? { width: source.width, height: source.height } : {}), style: { ...source.style }, ...(source.parent ? { parent: source.parent } : {}) };
  const node = placeConnectedNode(source, styled, direction, document.nodes.filter(n => n.parent === source.parent), document.nodes.find(n => n.id === source.parent));
  const opposite: Record<FlowchartDirection, FlowchartDirection> = { right: "left", left: "right", up: "down", down: "up" };
  return readFlowchart({ ...document, nodes: [...document.nodes, node], edges: [...document.edges, {
    id: edgeId, source: { node: id, anchor: directionAnchor(source, direction) }, target: { node: nodeId, anchor: directionAnchor(node, opposite[direction]) },
    routing: "orthogonal", connector: "rounded", vertices: [], label: "", labelPosition: 0.5,
    style: { targetArrow: "block", ...(source.style.stroke ? { stroke: source.style.stroke } : {}), ...(source.style.drawing ? { drawing: source.style.drawing } : {}) },
  }] });
}
