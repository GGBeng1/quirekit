import { Extension } from "@quirekit/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type Node as ProseMirrorNode
} from "@quirekit/pm";

/** Options accepted by the focus decoration extension. */
export interface FocusOptions {
  /** Class name added to focused node decorations. */
  readonly className: string;
  /** How many ancestors of the active node should receive the focus class. */
  readonly mode: "all" | "deepest" | "shallowest";
}

/** Extension that marks focused nodes with a decoration class. */
export const Focus = Extension.create<FocusOptions>({
  name: "focus",

  /**
   * Creates default focus decoration options.
   *
   * @returns Default focus configuration.
   */
  addOptions() {
    return {
      className: "has-focus",
      mode: "all"
    };
  },

  /**
   * Creates the focus decoration plugin.
   *
   * @returns ProseMirror plugin list containing focus decorations.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("focus"),
        props: {
          decorations: ({ doc, selection }: EditorState) => {
            const editor = this.editor;
            const decorations: Decoration[] = [];

            if (!editor?.isEditable || !editor.isFocused) {
              return DecorationSet.create(doc, []);
            }

            const { anchor } = selection;
            let maxLevels = 0;

            if (this.options.mode === "deepest") {
              doc.descendants((node: ProseMirrorNode, pos: number) => {
                if (node.isText) {
                  return;
                }

                const isCurrent = anchor >= pos && anchor <= pos + node.nodeSize - 1;

                if (!isCurrent) {
                  return false;
                }

                maxLevels += 1;
              });
            }

            let currentLevel = 0;

            doc.descendants((node: ProseMirrorNode, pos: number) => {
              if (node.isText) {
                return false;
              }

              const isCurrent = anchor >= pos && anchor <= pos + node.nodeSize - 1;

              if (!isCurrent) {
                return false;
              }

              currentLevel += 1;

              const outOfScope =
                (this.options.mode === "deepest" && maxLevels - currentLevel > 0) ||
                (this.options.mode === "shallowest" && currentLevel > 1);

              if (outOfScope) {
                return this.options.mode === "deepest";
              }

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: this.options.className
                })
              );
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});
