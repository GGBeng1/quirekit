import { removeFlowchartSelection } from "../clipboard/operations";
import { replaceFlowchartShapes } from "../editing/shapes";
import { canSetFlowchartGeometry, setFlowchartGeometry } from "../geometry/properties";
import { layoutFlowchart } from "../layout/operations";
import { createFlowchartNode } from "../model/create";
import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartEdge, FlowchartNode } from "../model/types";
import { updateFlowchartContent } from "../modeling/content";
import { isFlowchartContainer } from "../structure/hierarchy";
import { spreadFlowchartBranches } from "./branches";
import { makeRoomForFlowchartNode, placeInFlowchartLanes } from "./owners";
import type { FlowchartDiagramEdgePatch, FlowchartDiagramNodePatch, FlowchartDiagramPatch } from "./types";

/**
 * Applies an Agent edit to a flowchart graph, keeping its revision.
 *
 * Deletions run first, then node and connection changes by id, then layout. New nodes without
 * coordinates follow their lane's content, or are arranged in layers among the existing shapes.
 * Lanes and containers grow right and down to hold the nodes placed in them. New branches leaving
 * one node forward are attached to distinct sides so their labels do not stack.
 *
 * @param document - Current graph.
 * @param patch - Schema-valid Agent edit.
 * @returns Validated next graph with the same revision.
 * @throws Error naming the node or connection that cannot change.
 */
export function editFlowchartDiagram(document: FlowchartDocument, patch: FlowchartDiagramPatch): FlowchartDocument {
  const connected = new Set((patch.edges ?? []).filter(edge => edge.from !== undefined || edge.to !== undefined).map(edge => edge.id));
  return spreadFlowchartBranches(arrange(document, patch), connected, patch.layout === "right" ? "right" : "down");
}

/**
 * @param document - Current graph.
 * @param patch - Schema-valid Agent edit.
 * @returns Graph with the edit applied and new shapes placed.
 */
function arrange(document: FlowchartDocument, patch: FlowchartDiagramPatch): FlowchartDocument {
  let graph = readFlowchart(document);
  if (patch.remove?.length) {
    const missing = patch.remove.filter(id => !graph.nodes.some(node => node.id === id) && !graph.edges.some(edge => edge.id === id));
    if (missing.length) throw new Error(`要删除的节点或连线不存在：${missing.join("、")}`);
    graph = removeFlowchartSelection(graph, patch.remove);
  }
  const unplaced: string[] = [];
  for (const node of patch.nodes ?? []) {
    const existing = graph.nodes.find(item => item.id === node.id);
    if (existing) graph = changeNode(graph, existing, node);
    else {
      const created = createNode(node);
      graph = readFlowchart({ ...graph, nodes: [...graph.nodes, created] });
      if (node.x === undefined || node.y === undefined) unplaced.push(node.id);
      else graph = makeRoomForFlowchartNode(graph, created);
    }
  }
  for (const edge of patch.edges ?? []) graph = putEdge(graph, edge);
  if (patch.layout) return layoutFlowchart(graph, [], patch.layout === "right" ? "layout-right" : "layout-down");
  // Lane members follow their lane's content; other new shapes are laid out in layers.
  const sized = new Set((patch.nodes ?? []).filter(node => node.width !== undefined || node.height !== undefined).map(node => node.id));
  const { graph: placed, rest } = placeInFlowchartLanes(graph, unplaced, sized);
  if (!rest.length) return placed;
  // A graph made only of new shapes is laid out whole; otherwise new shapes avoid the existing ones.
  const fresh = placed.nodes.every(node => rest.includes(node.id));
  return layoutFlowchart(placed, fresh ? [] : rest, "layout-down");
}

/** @param patch - New node. @returns Node with default size, content and position. */
function createNode(patch: FlowchartDiagramNodePatch): FlowchartNode {
  const created = createFlowchartNode(patch.id, patch.shape ?? "process", { x: patch.x ?? 0, y: patch.y ?? 0 }, patch.text ?? "");
  return { ...created, ...(patch.width === undefined ? {} : { width: patch.width }), ...(patch.height === undefined ? {} : { height: patch.height }),
    ...(patch.parent ? { parent: patch.parent } : {}), ...content(created, patch) };
}

/**
 * @param graph - Current graph.
 * @param node - Existing node.
 * @param patch - Requested change.
 * @returns Graph with the node changed.
 */
function changeNode(graph: FlowchartDocument, node: FlowchartNode, patch: FlowchartDiagramNodePatch): FlowchartDocument {
  if (patch.shape !== undefined && patch.shape !== node.shape) graph = replaceFlowchartShapes(graph, [node.id], patch.shape);
  const current = graph.nodes.find(item => item.id === node.id)!;
  const structured = content(current, patch);
  if (Object.keys(structured).length) {
    graph = updateFlowchartContent(graph, node.id, { text: patch.text ?? current.text, ...structured });
  } else if (patch.text !== undefined && patch.text !== current.text) {
    // Partial formats address the old text, so a replaced caption drops them.
    const { textSpans: _spans, ...plain } = current;
    graph = readFlowchart({ ...graph, nodes: graph.nodes.map(item => item.id === node.id ? { ...plain, text: patch.text! } : item) });
  }
  const reparented = patch.parent !== undefined && (patch.parent ?? undefined) !== current.parent;
  if (reparented) {
    graph = readFlowchart({ ...graph, nodes: graph.nodes.map(item => {
      if (item.id !== node.id) return item;
      const { parent: _parent, ...rest } = item;
      return patch.parent ? { ...rest, parent: patch.parent } : rest;
    }) });
  }
  const fields = (["x", "y", "width", "height"] as const).filter(key => patch[key] !== undefined);
  const fixed = fields.filter(key => !canSetFlowchartGeometry(current.shape, key));
  if (fixed.length) {
    throw new Error(isFlowchartContainer(current.shape) ? `${node.id} 是泳道或容器，${fixed.join("、")} 会随其中节点自动调整，请只设置其中节点的位置`
      : `${node.id} 的 ${fixed.join("、")} 由图形类型决定，不能直接设置`);
  }
  if (!fields.length && !reparented) return graph;
  // Owners grow first, so the move, resize or new owner holds the node.
  const geometry = Object.fromEntries(fields.map(key => [key, patch[key]]));
  graph = makeRoomForFlowchartNode(graph, { ...graph.nodes.find(item => item.id === node.id)!, ...geometry });
  return fields.length ? setFlowchartGeometry(graph, [node.id], geometry) : graph;
}

/**
 * @param node - Node the content belongs to.
 * @param patch - Requested change.
 * @returns UML or entity content the patch sets for that node's shape.
 */
function content(node: FlowchartNode, patch: FlowchartDiagramNodePatch): Pick<FlowchartNode, "uml" | "entity"> {
  if (node.shape === "uml-class" && (patch.attributes || patch.operations)) {
    return { uml: { attributes: patch.attributes ?? node.uml?.attributes ?? [], operations: patch.operations ?? node.uml?.operations ?? [] } };
  }
  if (node.shape === "er-entity" && patch.fields) {
    return { entity: { fields: patch.fields.map(field => ({ name: field.name, type: field.type, key: field.key ?? "none" })) } };
  }
  return {};
}

/**
 * @param graph - Current graph.
 * @param patch - Connection to create or change.
 * @returns Graph with the connection in place.
 */
function putEdge(graph: FlowchartDocument, patch: FlowchartDiagramEdgePatch): FlowchartDocument {
  const existing = graph.edges.find(edge => edge.id === patch.id);
  if (!existing && (patch.from === undefined || patch.to === undefined)) throw new Error(`新连线 ${patch.id} 需要 from 和 to`);
  for (const id of [patch.from, patch.to]) {
    if (id !== undefined && !graph.nodes.some(node => node.id === id)) throw new Error(`连线 ${patch.id} 的端点节点不存在：${id}`);
  }
  const moved = patch.from !== undefined || patch.to !== undefined;
  const base: FlowchartEdge = existing ?? { id: patch.id, source: { node: patch.from! }, target: { node: patch.to! }, vertices: [],
    label: "", labelPosition: 0.5, routing: "orthogonal", style: {} };
  const next: FlowchartEdge = { ...base,
    ...(patch.from === undefined ? {} : { source: { node: patch.from } }),
    ...(patch.to === undefined ? {} : { target: { node: patch.to } }),
    // Manual bends belong to the old endpoints.
    ...(existing && moved ? { vertices: [] } : {}),
    ...(patch.label === undefined ? {} : { label: patch.label }),
    ...(patch.dashed === undefined ? {} : { style: { ...base.style, dashed: patch.dashed } }) };
  return readFlowchart({ ...graph, edges: existing ? graph.edges.map(edge => edge.id === patch.id ? next : edge) : [...graph.edges, next] });
}
