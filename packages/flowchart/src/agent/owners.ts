import { transformRoots } from "../arrange/selection";
import { flowchartContentOrigin } from "../geometry/bounds";
import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { assertFlowchartUnlocked } from "../objects/selection";
import { isFlowchartContainer } from "../structure/hierarchy";
import { fitPhases, laneGroup } from "../structure/swimlanes/layout";
import { flowchartNodeBounds } from "../transform/geometry";

/** Space kept between content and the right or bottom edge of a grown owner. */
const margin = 24;
/** Space between a node placed in a lane and the sibling before it. */
const gap = 48;

/** World rectangle. */
interface Box { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

/**
 * Grows the owners of a node so its proposed rectangle fits inside them.
 *
 * Owners grow right and down only; a lane keeps its group the same breadth and pushes later lanes,
 * with their content, by its growth. A rectangle left of or above the owner's content area is refused,
 * since growing that way would move content the edit did not name.
 *
 * @param graph - Current graph.
 * @param node - Node at its proposed geometry and owner.
 * @returns Graph whose owners contain the node.
 * @throws Error naming the node and the least x and y its owner accepts.
 */
export function makeRoomForFlowchartNode(graph: FlowchartDocument, node: FlowchartNode): FlowchartDocument {
  const parent = node.parent ? graph.nodes.find(item => item.id === node.parent) : undefined;
  if (!parent || !isFlowchartContainer(parent.shape)) return graph;
  const box = flowchartNodeBounds(node), origin = flowchartContentOrigin(parent);
  if (box.x < origin.x - 1e-6 || box.y < origin.y - 1e-6) {
    throw new Error(`节点 ${node.id} 超出 ${parent.text || parent.id} 的左侧或上方，x 至少为 ${Math.ceil(origin.x)}，y 至少为 ${Math.ceil(origin.y)}`);
  }
  return grow(graph, parent.id, box);
}

/**
 * Places new nodes that have a lane owner but no position after that lane's content.
 *
 * A node follows a connected predecessor in the same lane when there is one, otherwise the last
 * sibling, and takes that reference's style, and its size when the shape matches and none was
 * given, as a connected insertion in the editor does. Its owners grow to fit.
 *
 * @param graph - Graph with the nodes and their connections.
 * @param ids - New nodes awaiting a position.
 * @param sized - Nodes whose size the edit gave.
 * @returns Graph with lane members placed, and the ids still awaiting a position.
 */
export function placeInFlowchartLanes(graph: FlowchartDocument, ids: readonly string[], sized: ReadonlySet<string>): { graph: FlowchartDocument; rest: string[] } {
  const rest: string[] = [];
  for (const id of ids) {
    let node = graph.nodes.find(item => item.id === id)!;
    const lane = node.parent ? graph.nodes.find(item => item.id === node.parent) : undefined;
    if (lane?.shape !== "lane-horizontal" && lane?.shape !== "lane-vertical") { rest.push(id); continue; }
    const horizontal = lane.shape === "lane-horizontal", pending = new Set([...rest, ...ids.slice(ids.indexOf(id))]);
    /** @param item - Lane member. @returns Its far edge along the lane. */
    const end = (item: FlowchartNode) => horizontal ? item.x + item.width : item.y + item.height;
    const siblings = graph.nodes.filter(item => item.parent === lane.id && !pending.has(item.id));
    const predecessor = graph.edges.map(edge => "node" in edge.target && edge.target.node === id && "node" in edge.source ? edge.source.node : undefined)
      .map(source => siblings.find(item => item.id === source)).find(Boolean);
    const reference = predecessor ?? siblings.reduce<FlowchartNode | undefined>((last, item) => !last || end(item) > end(last) ? item : last, undefined);
    if (reference) {
      node = { ...node, style: { ...reference.style },
        ...(reference.shape === node.shape && !sized.has(id) ? { width: reference.width, height: reference.height } : {}) };
    }
    const origin = flowchartContentOrigin(lane);
    const after = siblings.length ? Math.max(...siblings.map(end)) + gap : (horizontal ? origin.x : origin.y) + margin;
    const across = reference ? (horizontal ? reference.y + (reference.height - node.height) / 2 : reference.x + (reference.width - node.width) / 2)
      : horizontal ? lane.y + (lane.height - node.height) / 2 : lane.x + (lane.width - node.width) / 2;
    const placed = { ...node, x: horizontal ? after : across, y: horizontal ? across : after };
    graph = makeRoomForFlowchartNode({ ...graph, nodes: graph.nodes.map(item => item.id === id ? placed : item) }, placed);
  }
  return { graph, rest };
}

/**
 * @param graph - Current graph.
 * @param ownerId - Innermost owner that must contain the rectangle.
 * @param box - Rectangle to contain, in world coordinates.
 * @returns Graph with that owner and, in turn, its own owners grown.
 */
function grow(graph: FlowchartDocument, ownerId: string, box: Box): FlowchartDocument {
  for (let owner = graph.nodes.find(node => node.id === ownerId); owner && isFlowchartContainer(owner.shape);) {
    const width = Math.max(owner.width, box.x + box.width + margin - owner.x), height = Math.max(owner.height, box.y + box.height + margin - owner.y);
    if (box.x + box.width <= owner.x + owner.width && box.y + box.height <= owner.y + owner.height) return graph;
    assertFlowchartUnlocked(graph, [owner.id]);
    const lanes = owner.shape === "lane-horizontal" || owner.shape === "lane-vertical";
    graph = lanes ? resizeLane(graph, owner, width, height)
      : readFlowchart({ ...graph, nodes: graph.nodes.map(node => node.id === owner!.id ? { ...node, width, height } : node) });
    const grown = lanes ? laneGroup(graph, owner.id) : [graph.nodes.find(node => node.id === owner!.id)!];
    box = union(grown.map(flowchartNodeBounds));
    owner = grown[0]!.parent ? graph.nodes.find(node => node.id === grown[0]!.parent) : undefined;
  }
  return graph;
}

/**
 * @param graph - Current graph.
 * @param lane - Lane to resize.
 * @param width - Requested width.
 * @param height - Requested height.
 * @returns Lane group sharing its cross size; later lanes and their content shift by the growth, keeping the gaps between lanes.
 */
function resizeLane(graph: FlowchartDocument, lane: FlowchartNode, width: number, height: number): FlowchartDocument {
  const group = laneGroup(graph, lane.id), horizontal = lane.shape === "lane-horizontal", index = group.findIndex(item => item.id === lane.id);
  const cross = Math.max(horizontal ? width : height, ...group.map(item => horizontal ? item.width : item.height));
  const growth = horizontal ? height - lane.height : width - lane.width, updates = new Map<string, FlowchartNode>();
  for (const [position, item] of group.entries()) {
    const shift = position > index ? growth : 0;
    updates.set(item.id, { ...item, ...(horizontal ? { width: cross, y: item.y + shift } : { height: cross, x: item.x + shift }),
      ...(item.id === lane.id ? (horizontal ? { height } : { width }) : {}) });
  }
  const moved = transformRoots(graph, updates);
  return readFlowchart(fitPhases(moved, group.map(item => moved.nodes.find(node => node.id === item.id)!)));
}

/** @param boxes - Non-empty rectangles. @returns Smallest rectangle containing them. */
function union(boxes: readonly Box[]): Box {
  const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y));
  return { x, y, width: Math.max(...boxes.map(box => box.x + box.width)) - x, height: Math.max(...boxes.map(box => box.y + box.height)) - y };
}
