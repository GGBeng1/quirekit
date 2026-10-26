import { insertSourceBlock, type Command } from "@quirekit/msfe-core";
import { isolateHistory } from "@quirekit/cm-commands";
import type { MindMapEmbed } from "@quirekit/mind-map";
import { mindMapMarkdown } from "./source";
import { mindMapInsertionTarget } from "./insertion";
import type { MsfeMindMapAgentInput } from "./ai/commands";

declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** Atomic mindMap source commits. */
    mindMap: {
      /** @param mind - Proposed mind map revision. @param insert - Whether to separate a new fence with blank lines. @returns Acceptance. */
      commitMindMap: (mind: MindMapEmbed, insert: boolean) => ReturnType;
      /** @param input - Prepared AI insertion. @returns Acceptance. */
      insertMindMap: (input: MsfeMindMapAgentInput) => ReturnType;
      /** @param input - Prepared AI change. @returns Acceptance. */
      updateMindMap: (input: MsfeMindMapAgentInput) => ReturnType;
    };
  }
}
/** @param mind - Validated source. @param insert - Insertion or exact fence replacement.
 * @returns One isolated history event through the canonical source transaction. */
export function commitMindMap(mind: MindMapEmbed, insert: boolean): Command {
  return ({ tr, state }) => {
    let fence: string; try { fence = mindMapMarkdown(mind); } catch { return false; }
    if (insert) {
      // The enclosing document-level block owns its syntax. Insert beside it,
      // never split a code fence, list or nested container at the text caret.
      const target = mindMapInsertionTarget(state, state.selection.main.from);
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
