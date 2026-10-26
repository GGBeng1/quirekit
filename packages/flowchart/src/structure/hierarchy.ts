import type { FlowchartNode, FlowchartShape } from "../model/types";

/** @param shape - Portable symbol. @returns Whether it owns a visible container body. */
export function isFlowchartContainer(shape: FlowchartShape): boolean {
  return shape === "group" || shape === "container" || shape === "lane-horizontal" || shape === "lane-vertical" || isSequenceFragment(shape);
}
/** @param shape - Portable symbol. @returns Whether it owns a sequence lifeline. */
export function isSequenceParticipant(shape: FlowchartShape): boolean { return shape === "lifeline" || shape === "actor-lifeline"; }
/** @param shape - Portable symbol. @returns Whether this is a visual combined-fragment frame. */
export function isSequenceFragment(shape: FlowchartShape): boolean { return shape === "sequence-alt" || shape === "sequence-opt" || shape === "sequence-loop"; }
/** @param nodes - Individually validated nodes. Validates references without relying on input order. */
export function validateHierarchy(nodes: readonly FlowchartNode[]): void {
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (const node of nodes) {
    if (node.parent) {
      const parent = byId.get(node.parent);
      if (!parent || (!isFlowchartContainer(parent.shape) && !(isSequenceParticipant(parent.shape) && (node.shape === "activation" || node.shape === "destruction")))) throw new TypeError("parent: missing or invalid container");
    }
    // Bounded ancestry makes validation safe even for adversarial JSON order;
    // no recursive call stack or silent orphan repair is admitted.
    const visited = new Set([node.id]); let parent = node.parent;
    while (parent) {
      if (visited.has(parent)) throw new TypeError("parent: cyclic hierarchy");
      if (visited.size >= 32) throw new RangeError("parent: depth limit exceeded");
      visited.add(parent); parent = byId.get(parent)?.parent;
    }
  }
}
