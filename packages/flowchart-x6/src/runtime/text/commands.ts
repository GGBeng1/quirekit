import { serializeFlowchart, updateFlowchartText } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../types";
import type { FlowRuntime, FlowTextInput } from "../types";
import { requireIdle } from "../commands";
import { requireAuthoring } from "../structure/permissions";
import { readGraph } from "../../codec/read";
import { isLocked } from "../structure/permissions";

/** @param runtime - One instance. @param input - Native text owner. @returns Explicit validated text command that repaints only its target. */
export function createCaptionCommands(runtime: FlowRuntime, input: FlowTextInput): Pick<FlowchartEditor, "setTextContent"> {
  return { setTextContent(id, text, spans, expected) {
    requireAuthoring(runtime); requireIdle(runtime, input);
    const cell = runtime.graph.getCellById(id); if (!cell?.isNode() || isLocked(cell)) throw new Error("请选择普通文字节点");
    const before = readGraph(runtime.graph, runtime.options.document.revision), node = before.nodes.find(item => item.id === id)!;
    const after = updateFlowchartText(before, id, text, spans, expected); serializeFlowchart(after);
    const source = after.nodes.find(item => item.id === id)!;
    if (JSON.stringify(node) !== JSON.stringify(source)) cell.setData({ source }, { overwrite: true });
  } };
}
