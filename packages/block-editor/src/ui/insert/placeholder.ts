import { Extension } from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, type EditorState } from "@quirekit/pm";
import { readBlockListFeature } from "../../lists/feature";

/** Active paragraph hint resolved from the selection path without scanning the document. */
export const BlockWritingHint = Extension.create({
  name: "blockWritingHint",
  /** @returns Product-owned decoration with no text, input or history ownership. */
  addProseMirrorPlugins() {
    const editor = this.editor!;
    return [new Plugin({ props: {
      /** @param state - Current selection and source. @returns At most one empty paragraph hint. */
      decorations(state: EditorState) {
        const { $from, empty } = state.selection;
        if (!editor.isEditable || !empty || $from.depth === 0 || $from.parent.type.name !== "paragraph" || $from.parent.content.size) return null;
        if (readBlockListFeature(editor)?.kind($from.parent, state.doc)) return null;
        for (let depth = $from.depth - 1; depth > 0; depth -= 1) {
          if (["bulletList", "orderedList", "listItem"].includes($from.node(depth).type.name)) return null;
        }
        return DecorationSet.create(state.doc, [Decoration.node($from.before(), $from.after(), {
          class: "qk-block-writing-hint", "data-placeholder": "输入 / 插入内容块"
        })]);
      }
    } })];
  }
});
