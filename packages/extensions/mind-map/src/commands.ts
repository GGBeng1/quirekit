import type { RawCommands } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { readMindMapEmbed, serializeMindMapEmbed } from "@quirekit/mind-map";
import type { MindMapInsertion, MindMapUpdate } from "./types";
import { readMindMapNode } from "./source";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Atomic source mutations for shared mindMap blocks. */
    readonly mindMap: {
      /** @param request - Source and optional mapped selection. @returns Command acceptance. */ insertMindMap: (request: MindMapInsertion) => ReturnType;
      /** @param request - Exact original source and mapped position. @returns Command acceptance. */ updateMindMap: (request: MindMapUpdate) => ReturnType;
    };
  }
}
/** @returns Typed mutations; all writes remain inside the existing CommandManager transaction. */
export function mindMapCommands(): Pick<RawCommands, "insertMindMap" | "updateMindMap"> {
  return {
    insertMindMap: request => ({ editor, tr, commands, dispatch }) => {
      if (!editor.isEditable) return false;
      let mind; try { mind = readMindMapEmbed(request.document); } catch { return false; }
      const from = request.from ?? tr.selection.from, to = request.to ?? tr.selection.to;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > tr.doc.content.size) return false;
      if (dispatch) closeHistory(tr);
      return commands.insertContentAt({ from, to }, { type: "mindMap", attrs: { mind } });
    },
    updateMindMap: request => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !Number.isInteger(request.position) || request.position < 0 || request.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(request.position);
      if (!node || node.type.name !== "mindMap") return false;
      const current = readMindMapNode(node);
      let mind; try { mind = readMindMapEmbed(request.document); } catch { return false; }
      if (!current || serializeMindMapEmbed(current) !== request.expected || current.id !== mind.id || mind.document.revision !== current.document.revision + 1) return false;
      if (dispatch) closeHistory(tr).setNodeMarkup(request.position, undefined, { ...node.attrs, mind });
      return true;
    }
  };
}
