import type { QuireAiSourceCapability } from "@quirekit/ai-contract";
import { parseFlowchartEmbed, type FlowchartTerminal } from "@quirekit/flowchart";

/** Nodes and connections listed in a summary. */
const shownElements = 40;

/** @param value - Connection end. @returns Node id, or the free point. */
function terminal(value: FlowchartTerminal): string {
  return "node" in value ? value.node : `(${Math.round(value.x)},${Math.round(value.y)})`;
}

/**
 * Shows a flowchart fence as its identity, revision, nodes and connections instead of the graph JSON,
 * so the model can change it with `updateFlowchart`.
 */
export const msfeFlowchartAiCapabilities: readonly QuireAiSourceCapability[] = [{
  kind: "source-block",
  names: ["FencedCode"],
  present(block) {
    if (block.attrs.language !== "quirekit-flowchart") return undefined;
    try {
      const flow = parseFlowchartEmbed(block.text.split("\n").slice(1, -1).join("\n"));
      const nodes = flow.document.nodes.map(node => ({ id: node.id, shape: node.shape, text: node.text.replace(/\s+/gu, " ").trim(), ...(node.parent ? { parent: node.parent } : {}) }));
      const edges = flow.document.edges.map(edge => ({ id: edge.id, from: terminal(edge.source), to: terminal(edge.target), ...(edge.label ? { label: edge.label } : {}) }));
      const elements = [...nodes, ...edges];
      return {
        label: `流程图 ${JSON.stringify({ id: flow.id, revision: flow.document.revision, title: flow.title, total: elements.length, elements: elements.slice(0, shownElements) })}`,
        title: `流程图“${flow.title}”`,
        command: "updateFlowchart"
      };
    } catch {
      return { label: "流程图：源数据无效" };
    }
  }
}];
