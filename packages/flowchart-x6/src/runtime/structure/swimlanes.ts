import { localizeCreatedFlowContent } from "../locale/content";
import { addSwimlane, removeSwimlane, reorderSwimlane, equalizeSwimlanes, addSwimlanePhase, type FlowchartDocument } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import { applyStructure } from "./apply";
import type { FlowRuntime } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Writable graph. @param command - Explicit lane operation. Computes and applies one canonical structural transaction. */
export function executeSwimlane(runtime: FlowRuntime, command: string): void {
  const before = readGraph(runtime.graph, runtime.options.document.revision), selected = runtime.graph.getSelectedCells();
  if (selected.length !== 1 || !selected[0]!.isNode()) throw new TypeError("请选择一条泳道");
  const id = selected[0]!.id, created = `lane-${uuidv4()}`;
  let after: FlowchartDocument;
  if (command === "swimlane-add") after = addSwimlane(before, created, id);
  else if (command === "swimlane-remove") after = removeSwimlane(before, id);
  else if (command === "swimlane-before" || command === "swimlane-after") after = reorderSwimlane(before, id, command === "swimlane-before" ? -1 : 1);
  else if (command === "swimlane-equalize") after = equalizeSwimlanes(before, id);
  else if (command === "swimlane-phase") after = addSwimlanePhase(before, created, id);
  else throw new TypeError("未知泳道命令");
  applyStructure(runtime, before, localizeCreatedFlowContent(before, after, runtime.locale), command === "swimlane-add" || command === "swimlane-phase" ? [created] : [id]);
}
