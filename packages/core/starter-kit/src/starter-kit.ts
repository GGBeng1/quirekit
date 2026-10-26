import { Extension, type QuireAnyExtension } from "@quirekit/core";
import {
  BaseKeymap,
  Gapcursor,
  TrailingNode,
  UndoRedo
} from "@quirekit/extensions";
import {
  Bold,
  Code,
  Italic,
  Strike,
  Underline
} from "./marks";
import {
  Blockquote,
  BulletList,
  CodeBlock,
  Document,
  HardBreak,
  Heading,
  HorizontalRule,
  ListItem,
  ListKeymap,
  OrderedList,
  Paragraph,
  Text
} from "./nodes";
import type { StarterKitOptions } from "./types";

export {
  BaseKeymap,
  Gapcursor,
  TrailingNode,
  UndoRedo
} from "@quirekit/extensions";
export {
  Bold,
  Code,
  Italic,
  Strike,
  Underline
} from "./marks";
export {
  Blockquote,
  CodeBlock,
  Document,
  HardBreak,
  Heading,
  HorizontalRule,
  BulletList,
  ListItem,
  ListKeymap,
  ListKit,
  OrderedList,
  Paragraph,
  Text
} from "./nodes";
export type { StarterKitOptions } from "./types";

/**
 * Tiptap-compatible starter kit extension bundle.
 *
 * Install this extension directly when consumers want Tiptap-style setup:
 * `extensions: [StarterKit]`.
 */
export const StarterKit = Extension.create<StarterKitOptions>({
  name: "starterKit",

  /**
   * Creates the default starter-kit options.
   *
   * @returns Empty options; each child extension is enabled by default.
   */
  addOptions() {
    return {};
  },

  /**
   * Creates the starter child extensions for this configured bundle.
   *
   * @returns Child extensions installed by the starter kit.
   */
  addExtensions() {
    return createStarterKitExtensions(this.options);
  }
});

export default StarterKit;

/**
 * Creates child extensions for a configured starter-kit bundle.
 *
 * @param options - Starter kit composition options.
 * @returns Ordered starter child extensions.
 */
function createStarterKitExtensions(
  options: StarterKitOptions = {}
): readonly QuireAnyExtension[] {
  const document = options.document ?? {};
  const paragraph = options.paragraph ?? {};
  const text = options.text ?? {};
  const blockquote = options.blockquote ?? {};
  const hardBreak = options.hardBreak ?? {};
  const heading = options.heading ?? {};
  const horizontalRule = options.horizontalRule ?? {};
  const codeBlock = options.codeBlock ?? {};
  const bulletList = options.bulletList ?? {};
  const listItem = options.listItem ?? {};
  const listKeymap = options.listKeymap ?? {};
  const orderedList = options.orderedList ?? {};
  const bold = options.bold ?? {};
  const code = options.code ?? {};
  const italic = options.italic ?? {};
  const strike = options.strike ?? {};
  const underline = options.underline ?? {};
  const gapcursor = options.gapcursor ?? {};
  const trailingNode = options.trailingNode ?? {};
  const baseKeymap = options.baseKeymap ?? true;
  const undoRedo = options.undoRedo ?? {};

  return [
    ...(document === false ? [] : [Document.configure(document)]),
    ...(paragraph === false ? [] : [Paragraph.configure(paragraph)]),
    ...(text === false ? [] : [Text.configure(text)]),
    ...(blockquote === false ? [] : [Blockquote.configure(blockquote)]),
    ...(hardBreak === false ? [] : [HardBreak.configure(hardBreak)]),
    ...(heading === false ? [] : [Heading.configure(heading)]),
    ...(horizontalRule === false ? [] : [HorizontalRule.configure(horizontalRule)]),
    ...(codeBlock === false ? [] : [CodeBlock.configure(codeBlock)]),
    ...(bulletList === false ? [] : [BulletList.configure(bulletList)]),
    ...(listItem === false ? [] : [ListItem.configure(listItem)]),
    ...(listKeymap === false ? [] : [ListKeymap.configure(listKeymap)]),
    ...(orderedList === false ? [] : [OrderedList.configure(orderedList)]),
    ...(bold === false ? [] : [Bold.configure(bold)]),
    ...(code === false ? [] : [Code.configure(code)]),
    ...(italic === false ? [] : [Italic.configure(italic)]),
    ...(strike === false ? [] : [Strike.configure(strike)]),
    ...(underline === false ? [] : [Underline.configure(underline)]),
    ...(gapcursor === false ? [] : [Gapcursor.configure(gapcursor)]),
    ...(trailingNode === false ? [] : [TrailingNode.configure(trailingNode)]),
    ...(baseKeymap ? [BaseKeymap] : []),
    ...(undoRedo === false ? [] : [UndoRedo.configure(undoRedo)])
  ];
}
