import {
  Extension,
  isNodeSelection
} from "@quirekit/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState
} from "@quirekit/pm";

/** Options accepted by the selection decoration extension. */
export interface SelectionOptions {
  /** Class name added to the visible selection decoration. */
  readonly className: string;
}

/** Extension that decorates selected text while the editor is not focused. */
export const Selection = Extension.create<SelectionOptions>({
  name: "selection",

  /**
   * Creates default selection decoration options.
   *
   * @returns Default selection configuration.
   */
  addOptions() {
    return {
      className: "selection"
    };
  },

  /**
   * Creates the selection decoration plugin.
   *
   * @returns ProseMirror plugin list containing selection decorations.
   */
  addProseMirrorPlugins() {
    const { editor, options } = this;

    return [
      new Plugin({
        key: new PluginKey("selection"),
        props: {
          decorations(state: EditorState) {
            const dragging = Boolean(
              (editor?.view as unknown as { readonly dragging?: unknown } | undefined)
                ?.dragging
            );

            if (
              state.selection.empty ||
              editor?.isFocused ||
              !editor?.isEditable ||
              isNodeSelection(state.selection) ||
              dragging
            ) {
              return null;
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(state.selection.from, state.selection.to, {
                class: options.className
              })
            ]);
          }
        }
      })
    ];
  }
});
