import type { RawCommands } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { readWhiteboardDocument, serializeWhiteboard } from "@quirekit/whiteboard";
import type { WhiteboardInsertion, WhiteboardUpdate } from "./types";
import { readWhiteboardNode } from "./source";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Atomic source mutations for shared whiteboard blocks. */
    readonly whiteboard: {
      /** @param request - Source and optional mapped selection. @returns Command acceptance. */ insertWhiteboard: (request: WhiteboardInsertion) => ReturnType;
      /** @param request - Exact original source and mapped position. @returns Command acceptance. */ updateWhiteboard: (request: WhiteboardUpdate) => ReturnType;
    };
  }
}
/** @returns Typed mutations; all writes remain inside the existing CommandManager transaction. */
export function whiteboardCommands(): Pick<RawCommands, "insertWhiteboard" | "updateWhiteboard"> {
  return {
    insertWhiteboard: request => ({ editor, tr, commands, dispatch }) => {
      if (!editor.isEditable) return false;
      let board; try { board = readWhiteboardDocument(request.document); } catch { return false; }
      const from = request.from ?? tr.selection.from, to = request.to ?? tr.selection.to;
      if (from < 0 || to < from || to > tr.doc.content.size) return false;
      if (dispatch) closeHistory(tr);
      return commands.insertContentAt({ from, to }, { type: "whiteboard", attrs: { board } });
    },
    updateWhiteboard: request => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || request.position < 0 || request.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(request.position);
      if (!node || node.type.name !== "whiteboard") return false;
      const current = readWhiteboardNode(node);
      if (!current || serializeWhiteboard(current) !== request.expected || current.id !== request.document.id || request.document.revision !== current.revision + 1) return false;
      let board; try { board = readWhiteboardDocument(request.document); } catch { return false; }
      if (dispatch) closeHistory(tr).setNodeMarkup(request.position, undefined, { ...node.attrs, board });
      return true;
    }
  };
}
