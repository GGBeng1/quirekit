import type { QuireEditor } from "@quirekit/core";
import type { ClassicEditorBlockTypeContribution } from "@classic/types";

/**
 * Supplies ordinary textblock presets only when no feature owns block types.
 * @param editor - Current generic schema and command owner.
 * @returns Generic paragraph and installed heading presets.
 */
export function createGenericBlockTypes(editor: QuireEditor): readonly ClassicEditorBlockTypeContribution[] {
  return [0, 1, 2, 3, 4, 5, 6].filter(level => editor.schema.nodes[level ? "heading" : "paragraph"])
    .map(level => {
      const type = level ? "heading" : "paragraph";
      const attrs = level ? { level } : {};
      const id = level ? `block.heading-${level}` : "block.paragraph";
      const label = level ? { "zh-CN": `标题 ${level}`, en: `Heading ${level}` } : { "zh-CN": "正文", en: "Paragraph" };
      return {
        kind: "block-type", id, label,
        icon: level ? level === 1 ? "heading" : `heading${level}` : "type",
        /** @returns Empty content in this generic schema type. */
        createContent: () => ({ type, attrs }),
        action: {
          id, label, order: level,
          /** @param context - Live command owner. @returns Whether the conversion ran. */
          run: ({ editor: owner }) => owner.commands.setNode(type, attrs),
          /** @param context - Live command owner. @returns Whether conversion is admitted. */
          canExecute: ({ editor: owner }) => owner.isEditable && owner.can().setNode(type, attrs),
          /** @param context - Live selection owner. @returns Whether this type is selected. */
          isActive: ({ editor: owner }) => owner.isActive(type, attrs)
        }
      };
    });
}
