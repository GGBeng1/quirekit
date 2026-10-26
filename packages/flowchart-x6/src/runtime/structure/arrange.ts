import { transformFlowchart, type FlowchartTransform, arrangeFlowchart, layoutFlowchart, type FlowchartLayout, type FlowchartArrange } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import { applyStructure } from "./apply";
import type { FlowRuntime } from "../types";

/** @param runtime - Writable instance. @param command - Portable arrangement intent. */
export function executeArrange(runtime: FlowRuntime, command: FlowchartArrange | FlowchartLayout | FlowchartTransform): void {
  const before = readGraph(runtime.graph,runtime.options.document.revision), ids = runtime.graph.getSelectedCells().map(cell => cell.id);
  applyStructure(runtime,before,/^(rotate-|flip-|transform-)/.test(command) ? transformFlowchart(before,ids,command as FlowchartTransform) : command.startsWith("layout-") ? layoutFlowchart(before,ids,command as FlowchartLayout) : arrangeFlowchart(before,ids,command as FlowchartArrange),ids);
}
