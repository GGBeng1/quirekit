import { groupFlowchart, ungroupFlowchart, orderFlowchart, lockFlowchart, type FlowchartObjectCommand, type FlowchartLayer } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import { applyStructure } from "./apply";
import type { FlowRuntime } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Writable graph. @param command - Ownership, lock or layer intent. */
export function executeObject(runtime: FlowRuntime, command: FlowchartObjectCommand): void {
  const before = readGraph(runtime.graph, runtime.options.document.revision), ids = runtime.graph.getSelectedCells().map(cell => cell.id);
  let after = before, selection = ids;
  if (command === "group") {
    const id = `group-${uuidv4()}`;
    after = groupFlowchart(before, ids, id); selection = [id];
  } else if (command === "ungroup") {
    after = ungroupFlowchart(before, ids);
    const retained = new Set(after.nodes.map(n => n.id));
    selection = before.nodes.filter(n => n.parent && !retained.has(n.parent) && retained.has(n.id)).map(n => n.id);
  } else if (command === "lock" || command === "unlock" || command === "unlock-all") after = lockFlowchart(before, ids, command === "lock", command === "unlock-all");
  else after = orderFlowchart(before, ids, command.slice(6) as FlowchartLayer);
  applyStructure(runtime, before, after, selection);
}
