import { Plugin, PluginKey } from "@quirekit/pm";
import { Extension } from "../extension";

/** Options accepted by the Tiptap-compatible tabindex extension. */
export interface TabindexOptions {
  /** Value written to editable editor host elements. */
  readonly value: string;
}

/** Tiptap-compatible extension that exposes an editable tabindex attribute. */
export const Tabindex = Extension.create<TabindexOptions>({
  name: "tabindex",

  /**
   * Creates default tabindex options.
   *
   * @returns Default tabindex configuration.
   */
  addOptions() {
    return {
      value: "0"
    };
  },

  /**
   * Creates the ProseMirror attributes prop for editable views.
   *
   * @returns Plugin list containing the tabindex attribute bridge.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;
    const value = this.options.value;

    return [
      new Plugin({
        key: new PluginKey("tabindex"),
        props: {
          attributes: () => (editor?.isEditable ? { tabindex: value } : {})
        }
      })
    ];
  }
});
