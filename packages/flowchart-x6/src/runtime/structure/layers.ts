import type { Node } from "@antv/x6";
import { isFlowchartContainer, type FlowchartNode } from "@quirekit/flowchart";

/** @param node - Runtime node. @returns Stable source-array order independent of visual container depth. */
export function sourceOrder(node: Node): number { return Number(node.getProp("qkOrder") ?? node.getZIndex() ?? 0); }
/** @param node - Node whose parent chain is established. Projects layers without introducing source/history changes. */
export function presentLayer(node: Node): void {
  const source = node.getData<{ source: FlowchartNode }>().source;
  node.setZIndex(isFlowchartContainer(source.shape) ? -400000 + node.getAncestors().length * 10000 + sourceOrder(node) : sourceOrder(node), { qkDerived: true });
}
