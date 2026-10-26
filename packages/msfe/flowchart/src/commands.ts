import { insertSourceBlock, type Command } from "@quirekit/msfe-core";
import { isolateHistory } from "@quirekit/cm-commands";
import type { FlowchartEmbed } from "@quirekit/flowchart";
import { flowchartMarkdown } from "./source";
import { flowchartInsertionTarget } from "./insertion";
import type { MsfeFlowchartAgentInput } from "./ai/commands";

declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** Atomic flowchart source commits. */
    flowchart: {
      /** @param flow - Proposed scene revision. @param insert - Whether to separate a new fence with blank lines. @returns Acceptance. */
      commitFlowchart: (flow: FlowchartEmbed, insert: boolean) => ReturnType;
      /** @param input - Prepared AI insertion. @returns Acceptance. */
      insertFlowchart: (input: MsfeFlowchartAgentInput) => ReturnType;
      /** @param input - Prepared AI change. @returns Acceptance. */
      updateFlowchart: (input: MsfeFlowchartAgentInput) => ReturnType;
    };
  }
}
/** @param flow - Validated source. @param insert - Insertion or exact fence replacement.
 * @returns One isolated history event through the canonical source transaction. */
export function commitFlowchart(flow: FlowchartEmbed, insert: boolean): Command {
  return ({ tr, state }) => {
    let fence: string; try { fence = flowchartMarkdown(flow); } catch { return false; }
    if (insert) {
      // The enclosing document-level block owns its syntax. Insert beside it,
      // never split a code fence, list or nested container at the text caret.
      const target = flowchartInsertionTarget(state, state.selection.main.from);
      if (!target) return false;
      const { block } = target;
      if (block) {
        const spec = insertSourceBlock(block, "after", fence)(state);
        if (!spec) return false;
        tr.apply({ annotations: isolateHistory.of("full") });
        return tr.apply(spec);
      }
    }
    tr.apply({ annotations: isolateHistory.of("full") });
    return tr.insertText(insert ? `\n\n${fence}\n\n` : fence);
  };
}
