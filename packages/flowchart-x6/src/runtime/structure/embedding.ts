import type { Node } from "@antv/x6";
import { isFlowchartContainer, isSequenceParticipant, isSequenceFragment, sequenceHeaderHeight } from "@quirekit/flowchart";
import { readNode } from "../../codec/read";
import type { FlowRuntime } from "../types";
import { presentLayer } from "./layers";

/** @param runtime - Isolated graph. Installs candidate-only embedding and participant movement ownership. */
export function bindStructures(runtime: FlowRuntime): void {
  const { graph } = runtime, containers = new Set<Node>();
  graph.on("cell:added", ({ cell }) => { if (cell.isNode() && readNode(cell).shape !== "group" && isFlowchartContainer(readNode(cell).shape)) containers.add(cell); });
  graph.on("cell:removed", ({ cell }) => { if (cell.isNode()) containers.delete(cell); });
  graph.on("cell:change:parent", ({ cell }) => {
    if (!cell.isNode()) return;
    presentLayer(cell); cell.getDescendants().forEach(child => { if (child.isNode()) presentLayer(child); });
  });
  graph.options.embedding = { enabled: true, frontOnly: false,
    /** @param args - Moved node. @returns Eligible containers, smallest last because X6 examines candidates in reverse. */
    findParent({ node }) {
      if (runtime.readOnly || runtime.presenting || runtime.exporting) return [];
      const source = readNode(node), current = node.getParent();
      if ((source.shape === "activation" || source.shape === "destruction") && current?.isNode() && isSequenceParticipant(readNode(current).shape)) return [current];
      if (current?.isNode() && readNode(current).shape === "group") return [current];
      const box = node.getBBox();
      return [...containers].filter(parent => {
        if (parent === node || parent.isDescendantOf(node)) return false;
        const content = parent.getBBox().clone(), shape = readNode(parent).shape;
        if (isSequenceFragment(shape) && source.shape !== "text" && source.shape !== "note") return false;
        if (isSequenceParticipant(source.shape) && isSequenceFragment(shape)) return false;
        const left = shape === "lane-horizontal" ? Math.min(104, content.width / 4) : 0;
        const top = shape === "lane-horizontal" ? 0 : Math.min(48, content.height / 3);
        return box.x >= content.x + left && box.y >= content.y + top && box.right <= content.right && box.bottom <= content.bottom;
      }).sort((a, b) => b.getBBox().width * b.getBBox().height - a.getBBox().width * a.getBBox().height
        || a.getAncestors().length - b.getAncestors().length);
    },
    /** @param args - Candidate parent and child. @returns Whether ancestry remains acyclic and within the protocol bound. */
    validate({ parent, child }) {
      if (parent === child || parent.isDescendantOf(child)) return false;
      const depth = parent.getAncestors().length + 2;
      return depth + Math.max(0, ...child.getDescendants().map(node => node.getAncestors().length - child.getAncestors().length)) <= 32;
    },
  };
  // Individual participant motion owns the horizontal axis; moving its outer
  // container still translates the entire sequence in world coordinates.
  graph.options.translating.restrict = view => {
    if (!view?.cell.isNode()) return null;
    const node = readNode(view.cell);
    if (isSequenceParticipant(node.shape)) return { x: -1e6, y: node.y, width: 2e6, height: node.height };
    const parent = view.cell.getParent();
    if (node.shape === "destruction" && parent?.isNode() && isSequenceParticipant(readNode(parent).shape)) return { x: node.x, y: node.y, width: node.width, height: node.height };
    if (node.shape === "activation" && parent?.isNode() && isSequenceParticipant(readNode(parent).shape)) {
      const box = parent.getBBox(), header = sequenceHeaderHeight(readNode(parent));
      return { x: box.x + box.width / 2 - node.width / 2, y: box.y + header, width: node.width, height: box.height - header };
    }
    return null;
  };
}
