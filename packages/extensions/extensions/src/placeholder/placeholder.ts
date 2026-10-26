import {
  Extension,
  isNodeEmpty,
  type QuireEditor
} from "@quirekit/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type Node as ProseMirrorNode
} from "@quirekit/pm";

/** Default data attribute used for placeholder labels. */
const DEFAULT_DATA_ATTRIBUTE = "placeholder";

/** Props passed to dynamic placeholder callbacks. */
export interface PlaceholderProps {
  /** Editor that owns the placeholder extension. */
  readonly editor: QuireEditor;
  /** Empty ProseMirror node receiving the placeholder. */
  readonly node: ProseMirrorNode;
  /** Document position of the decorated node. */
  readonly pos: number;
  /** Whether the current selection anchor is inside this node. */
  readonly hasAnchor: boolean;
}

/** Options accepted by the placeholder extension. */
export interface PlaceholderOptions {
  /** Class name added when the whole editor is empty. */
  readonly emptyEditorClass: string;
  /** Class name added to every empty decorated node. */
  readonly emptyNodeClass: string;
  /** Data attribute name used for the placeholder label. */
  readonly dataAttribute: string;
  /** Static placeholder text or callback. */
  readonly placeholder: string | ((props: PlaceholderProps) => string);
  /** Whether placeholders should only show when the editor is editable. */
  readonly showOnlyWhenEditable: boolean;
  /** Whether only the current empty node should show a placeholder. */
  readonly showOnlyCurrent: boolean;
  /** Whether descendant empty nodes should also be inspected. */
  readonly includeChildren: boolean;
}

/**
 * Prepares the placeholder attribute by normalizing it for a `data-*` name.
 *
 * @param attr - Raw placeholder attribute segment.
 * @returns Safe kebab-ish placeholder attribute segment.
 */
export function preparePlaceholderAttribute(attr: string): string {
  return attr
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/^[0-9-]+/, "")
    .replace(/^-+/, "")
    .toLowerCase();
}

/** Extension that decorates empty nodes with placeholder metadata. */
export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",

  /**
   * Creates default placeholder options.
   *
   * @returns Default placeholder configuration.
   */
  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      dataAttribute: DEFAULT_DATA_ATTRIBUTE,
      placeholder: "Write something …",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false
    };
  },

  /**
   * Creates the placeholder decoration plugin.
   *
   * @returns ProseMirror plugin list containing placeholder decorations.
   */
  addProseMirrorPlugins() {
    const dataAttribute = this.options.dataAttribute
      ? `data-${preparePlaceholderAttribute(this.options.dataAttribute)}`
      : `data-${DEFAULT_DATA_ATTRIBUTE}`;

    return [
      new Plugin({
        key: new PluginKey("placeholder"),
        props: {
          decorations: ({ doc, selection }: EditorState) => {
            const editor = this.editor;
            const active = Boolean(
              editor && (editor.isEditable || !this.options.showOnlyWhenEditable)
            );
            const decorations: Decoration[] = [];

            if (!active || !editor) {
              return null;
            }

            const { anchor } = selection;
            const isEmptyDoc = editor.isEmpty;

            doc.descendants((node: ProseMirrorNode, pos: number) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && isNodeEmpty(node);

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmpty) {
                const classes = [this.options.emptyNodeClass];

                if (isEmptyDoc) {
                  classes.push(this.options.emptyEditorClass);
                }

                const placeholder =
                  typeof this.options.placeholder === "function"
                    ? this.options.placeholder({
                      editor,
                      node,
                      pos,
                      hasAnchor
                    })
                    : this.options.placeholder;

                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: classes.join(" "),
                    [dataAttribute]: placeholder
                  })
                );
              }

              return this.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});
