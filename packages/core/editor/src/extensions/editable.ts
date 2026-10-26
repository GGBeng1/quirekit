import { Plugin, PluginKey } from "@quirekit/pm";
import { Extension } from "../extension";

/** Tiptap-compatible extension that exposes editor editability to view props. */
export const Editable = Extension.create({
  name: "editable",

  /**
   * Creates the ProseMirror plugin that reflects `editor.isEditable`.
   *
   * @returns Plugin list containing the editable prop bridge.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("editable"),
        props: {
          editable: () => editor?.isEditable ?? true
        }
      })
    ];
  }
});
