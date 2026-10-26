import type { RawCommands, QuireJSONContent } from "@quirekit/core";
import { closeHistory, TextSelection } from "@quirekit/pm";
declare module "@quirekit/core" {
  /** Continuous document term definitions. */
  interface Commands<ReturnType> {
    /** Editing and source-preserving conversion. */
    readonly blockDefinitions: {
      /** @param position - Definition list boundary. @returns Whether a new term was added. */
      readonly addBlockDefinition: (position: number) => ReturnType;
      /** @param position - Definition list boundary. @returns Whether content was retained as paragraphs. */
      readonly unwrapBlockDefinitions: (position: number) => ReturnType;
      /** @param field - Paired field to focus. @returns Whether the selection was in an eligible item. */
      readonly navigateBlockDefinition: (field: "term" | "description") => ReturnType;
    };
  }
}
/** @returns Empty canonical fields, with placeholder UI kept outside source. */
export function emptyDefinition(): QuireJSONContent { return { type: "definitionItem", content: [
  { type: "definitionTerm" }, { type: "definitionDescription", content: [{ type: "paragraph" }] }
] }; }
/** @returns One-transaction definition mutations and keyboard field navigation. */
export function definitionCommands(): Partial<RawCommands> {
  return {
    addBlockDefinition: position => ({ editor, tr, commands, dispatch }) => {
      const list = position >= 0 && position < tr.doc.content.size ? tr.doc.nodeAt(position) : null;
      if (!editor.isEditable || list?.type.name !== "definitionList") return false;
      const at = position + list.nodeSize - 1; closeHistory(tr);
      if (!commands.insertContentAt(at, emptyDefinition())) return false;
      if (dispatch) tr.setSelection(TextSelection.create(tr.doc, at + 2)).scrollIntoView();
      return true;
    },
    unwrapBlockDefinitions: position => ({ editor, tr, commands }) => {
      const list = position >= 0 && position < tr.doc.content.size ? tr.doc.nodeAt(position) : null;
      if (!editor.isEditable || list?.type.name !== "definitionList") return false;
      const paragraphs: QuireJSONContent[] = [];
      list.forEach(item => { paragraphs.push({ type: "paragraph", content: item.firstChild!.toJSON().content ?? [] }); item.lastChild!.forEach(p => paragraphs.push(p.toJSON())); });
      closeHistory(tr); return commands.insertContentAt({ from: position, to: position + list.nodeSize }, paragraphs);
    },
    navigateBlockDefinition: field => ({ tr, dispatch }) => {
      const { $from } = tr.selection;
      let depth = $from.depth; while (depth > 0 && $from.node(depth).type.name !== "definitionItem") depth--;
      if (!depth) return false;
      const start = $from.start(depth), item = $from.node(depth);
      if (field === "description" && $from.parent.type.name !== "definitionTerm") return false;
      if (dispatch) tr.setSelection(TextSelection.create(tr.doc, field === "term" ? start + 1 : start + item.firstChild!.nodeSize + 2)).scrollIntoView();
      return true;
    }
  };
}
