import type {
  ClassicEditorInsertGroupDefinition,
  ClassicEditorInsertGroupId
} from "../../types/insert";

/** Frozen task-oriented groups shared by every Insert occurrence. */
export const classicEditorInsertGroups: readonly ClassicEditorInsertGroupDefinition[] =
  Object.freeze([
    {
      id: "inline",
      label: { "zh-CN": "行内", en: "Inline" },
      description: {
        "zh-CN": "链接、符号与跟随文字流的轻量内容",
        en: "Links, symbols, and lightweight content that follows text flow"
      },
      order: 100
    },
    {
      id: "structure",
      label: { "zh-CN": "结构", en: "Structure" },
      description: {
        "zh-CN": "表格、分隔线、分页与文档结构",
        en: "Tables, dividers, breaks, and document structure"
      },
      order: 200
    },
    {
      id: "media",
      label: { "zh-CN": "媒体", en: "Media" },
      description: {
        "zh-CN": "图片、附件与需要资源摄取的对象",
        en: "Images, attachments, and resource-backed objects"
      },
      order: 300
    },
    {
      id: "control",
      label: { "zh-CN": "控件", en: "Control" },
      description: {
        "zh-CN": "内容控件、字段与交互式文档对象",
        en: "Content controls, fields, and interactive document objects"
      },
      order: 400
    }
  ]);

/**
 * Resolves immutable metadata for one known Insert group.
 *
 * @param id - Stable group identity.
 * @returns Matching group metadata.
 */
export function getClassicEditorInsertGroup(
  id: ClassicEditorInsertGroupId
): ClassicEditorInsertGroupDefinition {
  return classicEditorInsertGroups.find((group) => group.id === id)!;
}
