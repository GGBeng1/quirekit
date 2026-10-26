import type { RawCommands } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { readTextDiagram, serializeTextDiagram } from "@quirekit/text-diagram";
import type { TextDiagramInsertion, TextDiagramUpdate } from "./types";
import { readTextDiagramNode } from "./source";

declare module "@quirekit/core" {
  /** Feature commands in the canonical command table. */
  interface Commands<ReturnType> {
    /** Atomic source mutations for shared textDiagram blocks. */
    readonly textDiagram: {
      /** @param request - Source and optional mapped selection. @returns Command acceptance. */ insertTextDiagram: (request: TextDiagramInsertion) => ReturnType;
      /** @param request - Exact original source and mapped position. @returns Command acceptance. */ updateTextDiagram: (request: TextDiagramUpdate) => ReturnType;
    };
  }
}
/** @returns Typed mutations; all writes remain inside the existing CommandManager transaction. */
export function textDiagramCommands(): Pick<RawCommands, "insertTextDiagram" | "updateTextDiagram"> {
  return {
    insertTextDiagram: request => ({ editor, tr, commands, dispatch }) => {
      if (!editor.isEditable) return false;
      let diagram; try { diagram = readTextDiagram(request.document); } catch { return false; }
      const from = request.from ?? tr.selection.from, to = request.to ?? tr.selection.to;
      if (from < 0 || to < from || to > tr.doc.content.size) return false;
      if (dispatch) closeHistory(tr);
      return commands.insertContentAt({ from, to }, { type: "textDiagram", attrs: { diagram } });
    },
    updateTextDiagram: request => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || request.position < 0 || request.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(request.position);
      if (!node || node.type.name !== "textDiagram") return false;
      const current = readTextDiagramNode(node);
      let diagram; try { diagram = readTextDiagram(request.document); } catch { return false; }
      if (!current || serializeTextDiagram(current) !== request.expected || current.id !== diagram.id || diagram.document.revision !== current.document.revision + 1) return false;
      if (dispatch) closeHistory(tr).setNodeMarkup(request.position, undefined, { ...node.attrs, diagram });
      return true;
    }
  };
}
