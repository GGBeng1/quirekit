import { Plugin, PluginKey, type Slice } from "@quirekit/pm";
import { Extension } from "../extension";
import {
  getTextBetween,
  getTextSerializersFromSchema,
  type TextSerializer
} from "../helpers";

/** Options accepted by the Tiptap-compatible clipboard text serializer. */
export interface ClipboardTextSerializerOptions {
  /** Separator inserted between block nodes. */
  readonly blockSeparator?: string | undefined;
}

/** Tiptap-compatible extension that serializes selected content as plain text. */
export const ClipboardTextSerializer = Extension.create<ClipboardTextSerializerOptions>({
  name: "clipboardTextSerializer",

  /**
   * Creates default serializer options.
   *
   * @returns Default clipboard text serializer options.
   */
  addOptions() {
    return {
      blockSeparator: undefined
    };
  },

  /**
   * Creates the ProseMirror clipboard text serializer prop.
   *
   * @returns Plugin list containing the serializer prop.
   */
  addProseMirrorPlugins() {
    const editor = this.editor;
    const blockSeparator = this.options.blockSeparator;

    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: (slice?: Slice) => {
            if (!editor) {
              return "";
            }

            const textSerializers = getTextSerializersFromSchema(editor.schema);

            if (slice) {
              return getSliceTextBetween(slice, {
                ...(blockSeparator === undefined ? {} : { blockSeparator }),
                textSerializers
              });
            }

            const { doc, selection } = editor.state.pm;
            const from = Math.min(...selection.ranges.map((range) => range.$from.pos));
            const to = Math.max(...selection.ranges.map((range) => range.$to.pos));

            return getTextBetween(
              doc,
              { from, to },
              {
                ...(blockSeparator === undefined ? {} : { blockSeparator }),
                textSerializers
              }
            );
          }
        }
      })
    ];
  }
});

/**
 * Serializes text from a ProseMirror slice while honoring schema text serializers.
 *
 * @param slice - Slice supplied by the clipboard prop.
 * @param options - Text serialization options.
 * @returns Plain-text representation of the slice.
 */
function getSliceTextBetween(
  slice: Slice,
  options: {
    /** Text inserted between block nodes. */
    readonly blockSeparator?: string | undefined;
    /** Node-type-specific text serializers. */
    readonly textSerializers: Readonly<Record<string, TextSerializer>>;
  }
): string {
  const from = 0;
  const to = slice.content.size;
  const blockSeparator = options.blockSeparator ?? "\n\n";
  let text = "";

  slice.content.nodesBetween(from, to, (node, pos, parent, index) => {
    if (node.isBlock && pos > from) {
      text += blockSeparator;
    }

    const serializer = options.textSerializers[node.type.name];
    if (serializer && parent) {
      text += serializer({
        node,
        pos,
        parent,
        index,
        range: { from, to }
      });
      return false;
    }

    if (node.isText) {
      text += node.text?.slice(Math.max(from, pos) - pos, to - pos) ?? "";
    }

    return undefined;
  });

  return text;
}
