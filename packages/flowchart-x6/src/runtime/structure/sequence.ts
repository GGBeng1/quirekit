import { localizeCreatedFlowContent } from "../locale/content";
import { editSequenceMessage, type SequenceEdit, addSequenceActivation, addSequenceMessage, addSequenceParticipant, addSequenceDestruction, addSequenceFragment, type FlowchartDocument, type SequenceFragmentKind } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import { applyStructure } from "./apply";
import type { FlowRuntime } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Writable graph. @param command - Admitted sequence intent. Applies a pure structural change inside one history batch. */
export function executeSequence(runtime: FlowRuntime, command: string): void {
  const before = readGraph(runtime.graph, runtime.options.document.revision), ids = runtime.graph.getSelectedCells().filter(cell => cell.isNode()).map(cell => cell.id);
  const id = `sequence-${uuidv4()}`;
  let after: FlowchartDocument;
  if (/^sequence-(insert-|move-|remove-message)/.test(command)) {
    const selected = runtime.graph.getSelectedCells();
    if (selected.length !== 1 || !selected[0]!.isEdge()) throw new Error("请选择一条时序消息");
    after = editSequenceMessage(before, selected[0]!.id, command as SequenceEdit, id);
    applyStructure(runtime, before, localizeCreatedFlowContent(before, after, runtime.locale), [command.startsWith("sequence-insert-") ? id : selected[0]!.id]); return;
  }
  if (command === "sequence-participant" || command === "sequence-actor") after = addSequenceParticipant(before, id, ids[0], command === "sequence-actor");
  else if (command === "sequence-activation") after = addSequenceActivation(before, id, ids[0] ?? "");
  else if (command === "sequence-destroy") after = addSequenceDestruction(before, id, ids[0] ?? "");
  else if (["sequence-alt", "sequence-opt", "sequence-loop"].includes(command)) after = addSequenceFragment(before, id, ids, command.slice(9) as SequenceFragmentKind);
  else if (["sequence-message", "sequence-reply", "sequence-async", "sequence-self"].includes(command)) {
    const mode = command === "sequence-message" ? "request" : command === "sequence-reply" ? "reply" : command === "sequence-async" ? "async" : "self";
    after = addSequenceMessage(before, id, ids, mode);
  } else throw new TypeError("未知时序命令");
  applyStructure(runtime, before, localizeCreatedFlowContent(before, after, runtime.locale), [id]);
}
