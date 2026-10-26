import type { RawCommands } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { readFlowchartEmbed, serializeFlowchartEmbed } from "@quirekit/flowchart";
import type { FlowchartInsertion, FlowchartUpdate } from "./types";
import { readFlowchartNode } from "./source";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Atomic source mutations for shared flowchart blocks. */
    readonly flowchart: {
      /** @param request - Source and optional mapped selection. @returns Command acceptance. */ insertFlowchart: (request: FlowchartInsertion) => ReturnType;
      /** @param request - Exact original source and mapped position. @returns Command acceptance. */ updateFlowchart: (request: FlowchartUpdate) => ReturnType;
    };
  }
}
/** @returns Typed mutations; all writes remain inside the existing CommandManager transaction. */
export function flowchartCommands(): Pick<RawCommands, "insertFlowchart" | "updateFlowchart"> {
  return {
    insertFlowchart: request => ({ editor, tr, commands, dispatch }) => {
      if (!editor.isEditable) return false;
      let flow; try { flow = readFlowchartEmbed(request.document); } catch { return false; }
      const from = request.from ?? tr.selection.from, to = request.to ?? tr.selection.to;
      if (from < 0 || to < from || to > tr.doc.content.size) return false;
      if (dispatch) closeHistory(tr);
      return commands.insertContentAt({ from, to }, { type: "flowchart", attrs: { flow } });
    },
    updateFlowchart: request => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || request.position < 0 || request.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(request.position);
      if (!node || node.type.name !== "flowchart") return false;
      const current = readFlowchartNode(node);
      let flow; try { flow = readFlowchartEmbed(request.document); } catch { return false; }
      if (!current || serializeFlowchartEmbed(current) !== request.expected || current.id !== flow.id || flow.document.revision !== current.document.revision + 1) return false;
      if (dispatch) closeHistory(tr).setNodeMarkup(request.position, undefined, { ...node.attrs, flow });
      return true;
    }
  };
}
