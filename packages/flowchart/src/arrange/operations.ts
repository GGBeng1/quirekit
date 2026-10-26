import { flowchartNodeBounds } from "../transform/geometry";
import { assertFlowchartUnlocked } from "../objects/selection";
import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { isFlowchartContainer, isSequenceParticipant } from "../structure/hierarchy";
import { selectedRoots, transformRoots } from "./selection";
import type { FlowchartArrange } from "./types";

/** @param document - Valid immutable source. @param ids - Selected cells. @param command - Explicit arrangement. @returns Valid detached graph, ready for one history batch. */
export function arrangeFlowchart(document: FlowchartDocument, ids: readonly string[], command: FlowchartArrange): FlowchartDocument {
  assertFlowchartUnlocked(document, ids);
  const selected = selectedRoots(document,ids), originals = new Map(selected.map(n=>[n.id,n]));
  const roots = command.startsWith("size-") ? selected : selected.map(n=>({...n,...flowchartNodeBounds(n)})), updates = new Map<string,FlowchartNode>();
  const distribute = command.startsWith("distribute-"), size = command.startsWith("size-");
  if (roots.length < (distribute ? 3 : 2)) throw new TypeError(distribute ? "请至少选择三个图形" : "请至少选择两个图形");
  if (roots.some(n => n.parent !== roots[0]!.parent)) throw new TypeError("请选择同一容器内的图形");
  if (roots.some(n => n.shape.startsWith("lane-") || n.shape.startsWith("phase-") || ["activation","destruction"].includes(n.shape))) throw new TypeError("请使用专用结构工具调整这些元素");
  const minX = Math.min(...roots.map(n => n.x)), minY = Math.min(...roots.map(n => n.y));
  const maxX = Math.max(...roots.map(n => n.x + n.width)), maxY = Math.max(...roots.map(n => n.y + n.height));
  const maxWidth = Math.max(...roots.map(n => n.width)), maxHeight = Math.max(...roots.map(n => n.height));
  if (roots.some(n => isSequenceParticipant(n.shape)) && ["align-top","align-middle","align-bottom","distribute-vertical"].includes(command)) throw new TypeError("时序参与者只能横向排列");
  if (size && roots.some(n => isFlowchartContainer(n.shape) || isSequenceParticipant(n.shape))) throw new TypeError("结构图形请使用专用尺寸操作");
  if (distribute) {
    const horizontal = command === "distribute-horizontal";
    if (!horizontal && command !== "distribute-vertical") throw new TypeError("未知排列命令");
    const axis = horizontal ? "x" : "y", dimension = horizontal ? "width" : "height";
    const ordered = [...roots].sort((a,b) => a[axis] - b[axis]);
    let offset = horizontal ? minX : minY;
    const span = horizontal ? maxX - minX : maxY - minY;
    const gap = Math.max(0,(span - roots.reduce((sum,n) => sum + n[dimension],0)) / (roots.length - 1));
    for (const node of ordered) { updates.set(node.id,{ ...node, [axis]: offset }); offset += node[dimension] + gap; }
  } else for (const node of roots) {
    let next = { ...node };
    switch (command) {
      case "align-left": next.x = minX; break;
      case "align-center": next.x = (minX + maxX - node.width) / 2; break;
      case "align-right": next.x = maxX - node.width; break;
      case "align-top": next.y = minY; break;
      case "align-middle": next.y = (minY + maxY - node.height) / 2; break;
      case "align-bottom": next.y = maxY - node.height; break;
      case "size-width": next.width = maxWidth; break;
      case "size-height": next.height = maxHeight; break;
      case "size-both": next = { ...next, width: maxWidth,height: maxHeight }; break;
      default: throw new TypeError("未知排列命令");
    }
    updates.set(node.id,next);
  }
  // Alignment/distribution consume visual bounds, but only translate canonical
  // local rectangles. Size commands retain the explicitly requested local size.
  if (!size) for (const node of roots) {
    const next=updates.get(node.id)!, original=originals.get(node.id)!;
    updates.set(node.id,{...original,x:original.x+next.x-node.x,y:original.y+next.y-node.y});
  }
  return readFlowchart(transformRoots(document,updates));
}
