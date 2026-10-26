import { Plugin, PluginKey, type Slice } from "@quirekit/pm";
import { Extension } from "../extension";

/** Tiptap-compatible extension that emits editor paste events. */
export const Paste = Extension.create({
  name: "paste",

  /**
   * Creates the ProseMirror paste event bridge.
   *
   * @returns Plugin list containing the paste event bridge.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("tiptapPaste"),
        props: {
          handlePaste: (_view: unknown, event: ClipboardEvent, slice: Slice) => {
            if (editor) {
              editor.emit("paste", { editor, event, slice });
            }
            return event.defaultPrevented === true;
          }
        }
      })
    ];
  }
});
