import { Plugin, PluginKey, type Slice } from "@quirekit/pm";
import { Extension } from "../extension";

/** Tiptap-compatible extension that emits editor drop events. */
export const Drop = Extension.create({
  name: "drop",

  /**
   * Creates the ProseMirror drop event bridge.
   *
   * @returns Plugin list containing the drop event bridge.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("tiptapDrop"),
        props: {
          handleDrop: (
            _view: unknown,
            event: DragEvent,
            slice: Slice,
            moved: boolean
          ) => {
            if (editor) {
              editor.emit("drop", { editor, event, slice, moved });
            }
          }
        }
      })
    ];
  }
});
