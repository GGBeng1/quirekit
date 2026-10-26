import { Plugin, PluginKey, type Slice, type EditorView } from "@quirekit/pm";
import { linkPastedSlice } from "./transform";

/** @param name - Owning mark name. @returns Clipboard-only Link projection plugin. */
export function createLinkPastePlugin(name: string): Plugin {
  return new Plugin({
    key: new PluginKey("linkClipboard"),
    props: {
      /** @param slice - Parsed clipboard. @param view - Receiving view. @returns Context-safe linked slice. */
      transformPasted(slice: Slice, view: EditorView) {
        const type = view.state.schema.marks[name];
        const parent = view.state.selection.$from.parent;
        const marks = view.state.storedMarks ?? view.state.selection.$from.marks();
        return !type || parent.type.spec.code || marks.some(mark => mark.type.spec.code)
          || !parent.type.allowsMarkType(type)
          ? slice : linkPastedSlice(slice, type);
      }
    }
  });
}
