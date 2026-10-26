import type { RawCommands } from "@quirekit/core";
import { closeHistory, NodeSelection, TextSelection } from "@quirekit/pm";
import { v4 as uuid } from "uuid";
import { readNotes } from "./query";
import type { NoteInsert } from "./types";
declare module "@quirekit/core" {
  /** Canonical continuous-document footnotes. */
  interface Commands<ReturnType> {
    /** Footnote lifecycle and navigation. */
    readonly blockFootnotes: {
      /** @param options - Optional captured target. @returns Whether both ends can be inserted atomically. */
      readonly insertBlockFootnote: (options?: NoteInsert) => ReturnType;
      /** @param id - Stable association. @param destination - End to reveal. @returns Navigation acceptance. */
      readonly navigateBlockFootnote: (id: string, destination: "reference" | "definition") => ReturnType;
      /** @param id - Association to remove completely. @returns Whether the editable source exists. */
      readonly removeBlockFootnote: (id: string) => ReturnType;
    };
  }
}
/** @returns Typed source commands using one transaction/history owner. */
export function noteCommands(): Partial<RawCommands> {
  return {
    insertBlockFootnote: (options = {}) => ({ editor, tr, commands, dispatch }) => {
      if (!editor.isEditable || !tr.doc.type.schema.nodes.footnoteDefinition) return false;
      const id = dispatch ? uuid() : "can-footnote";
      const reference = { type: "footnoteReference", attrs: { noteId: id } };
      closeHistory(tr);
      const inserted = options.destination
        ? commands.insertBlockAt({ destination: options.destination, replaceEmpty: true, content: { type: "paragraph", content: [reference] } })
        : commands.insertContentAt(options.range ?? { from: tr.selection.from, to: tr.selection.to }, reference);
      if (!inserted) return false;
      const end = tr.doc.content.size;
      if (!commands.insertContentAt(end, { type: "footnoteDefinition", attrs: { noteId: id }, content: [{ type: "paragraph" }] })) return false;
      if (dispatch) tr.setSelection(TextSelection.create(tr.doc, end + 2)).scrollIntoView();
      return true;
    },
    navigateBlockFootnote: (id, destination) => ({ tr, dispatch }) => {
      const note = readNotes(tr.doc).find(note => note.id === id);
      const target = destination === "definition" ? note?.definitions[0] : note?.references[0];
      if (!target) return false;
      if (dispatch) tr.setSelection(destination === "definition" ? TextSelection.create(tr.doc, target.from + 2) : NodeSelection.create(tr.doc, target.from))
        .setMeta("addToHistory", false).scrollIntoView();
      return true;
    },
    removeBlockFootnote: id => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable) return false;
      const note = readNotes(tr.doc).find(note => note.id === id); if (!note) return false;
      if (dispatch) {
        closeHistory(tr);
        const references = note.references.filter(ref => !note.definitions.some(def => ref.from >= def.from && ref.to <= def.to));
        for (const range of [...references, ...note.definitions].sort((a, b) => b.from - a.from)) tr.delete(range.from, range.to);
      }
      return true;
    }
  };
}
