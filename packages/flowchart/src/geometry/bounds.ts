import type { FlowchartNode } from "../model/types";
import { flowchartNodeBounds } from "../transform/geometry";
import { isSequenceParticipant } from "../structure/hierarchy";
import { sequenceHeaderHeight } from "../structure/sequence/layout";

/** @param parent - Owner. @returns World top-left of the area its children may occupy, after any header. */
export function flowchartContentOrigin(parent: FlowchartNode): { x: number; y: number } {
  const shape = parent.shape;
  const left = shape === "lane-horizontal" ? Math.min(104, parent.width / 4) : 0;
  const top = shape === "group" || shape === "lane-horizontal" ? 0 : isSequenceParticipant(shape) ? sequenceHeaderHeight(parent) : Math.min(48, parent.height / 3);
  return { x: parent.x + left, y: parent.y + top };
}
/** @param node - Proposed world geometry. @param parent - Unchanged owner. Rejects overflow instead of silently changing ownership or structural layout. */
export function assertInsideOwner(node: FlowchartNode, parent: FlowchartNode): void {
  const box = flowchartNodeBounds(node), origin = flowchartContentOrigin(parent);
  if (box.x < origin.x - 1e-6 || box.y < origin.y - 1e-6
    || box.x + box.width > parent.x + parent.width + 1e-6 || box.y + box.height > parent.y + parent.height + 1e-6) {
    throw new RangeError("图形超出所属容器的内容区域");
  }
}
