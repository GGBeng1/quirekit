import type { FlowchartDocument } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import type { FlowRuntime } from "../types";
import { appendGraph } from "../content";
import { changeGraphPage } from "../pages/metadata";

/** Explicit whole-source event sharing the normal graph undo stack. */
export const flowReplacementEvent = "quirekit:document-replacement";
/** @param runtime - Writable authoritative owner. @param source - Already validated replacement. */
export function replaceFlowGraph(runtime: FlowRuntime, source: FlowchartDocument): void {
  const before = readGraph(runtime.graph, runtime.options.document.revision);
  if (JSON.stringify(before) === JSON.stringify(source)) return;
  replayFlowGraph(runtime, source);
  runtime.graph.model.notify(flowReplacementEvent, { cell: runtime.graph.model, before, after: source });
  runtime.notify();
}
/** @param runtime - Source owner. @param source - Frozen validated history source. Restores both cells and root metadata without creating cell commands or admitting reentrant authoring. */
export function replayFlowGraph(runtime: FlowRuntime, source: FlowchartDocument): void {
  runtime.replacing = true;
  try {
    // X6 filters remove/add pairs with equal IDs from batches. Capture this
    // explicit replacement as one root command, so same-ID content and kind
    // changes are restored rather than silently disappearing from history.
    runtime.graph.batchUpdate("replace", () => {
      runtime.graph.cleanSelection(); runtime.graph.removeCells(runtime.graph.getCells()); appendGraph(runtime, source);
      changeGraphPage(runtime, source.page, false);
    });
  } finally { runtime.replacing = false; }
}
