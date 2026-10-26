import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { openRichContent } from "./tasks";
/** Edit actions do not depend on the current caret or a second context menu. */
export const richContentMenu: EditorBlockMenuProvider = {
  id: "rich-content", order: 10,
  /** @param context - Captured canonical object. @returns Feature-specific editing. */
  getItems({editor, block}) {
    const type = block.node.type.name;
    if (!["blockAsset","imageGallery","webCard"].includes(type)) return [];
    const kind = type === "blockAsset" ? block.node.attrs.kind : type === "webCard" ? block.node.attrs.mode === "embed" ? "embed" : "webCard" : "imageGallery";
    return [{value:"edit",label:type === "imageGallery" ? "编辑多图" : type === "webCard" ? "编辑网页卡片" : "编辑媒体",icon:"edit",run:()=>openRichContent(editor,kind,undefined,block.from)}];
  }
};
