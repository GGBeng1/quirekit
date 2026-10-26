import type { WhiteboardPreview } from "./types";

/** @param preview - Validated source-bound pixels. @param inlineSize - Available document width. @returns Shared logical preview size, independent of raster density. */
export function whiteboardPreviewSize(preview: WhiteboardPreview | null, inlineSize = 720): Pick<WhiteboardPreview, "width" | "height"> {
  const ratio = preview ? preview.height / preview.width : 7 / 12;
  const width = Math.min(inlineSize, 720, 460 / ratio);
  return { width, height: width * ratio };
}

/** @param locale - Mounted host language. @returns Framework-neutral preview instructions; never serialized into document content. */
export function whiteboardPreviewMessages(locale = "zh-CN") {
  return /^en(?:-|$)/iu.test(locale.trim())
    ? { name: "Whiteboard", edit: "Double-click to edit", open: "Double-click to open whiteboard", invalid: "Invalid whiteboard data. The original source is preserved." }
    : { name: "白板", edit: "双击编辑", open: "双击打开白板", invalid: "白板数据无效，原始数据已保留" };
}
