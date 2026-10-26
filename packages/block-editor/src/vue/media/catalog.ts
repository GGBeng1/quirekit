import type { QuireKitToolbarEntry } from "@quirekit/ui";
/** @param image - Whether the selected source is a replaceable raster. @param linked - Whether it already has a hyperlink. @param preview - Whether an image preview is available. @returns Shared picture actions with direct viewing and distinct editing/reset glyphs. */
export function blockMediaToolbarItems(image: boolean, linked: boolean, preview: boolean): readonly QuireKitToolbarEntry[] {
 return [
 ...(!image ? [{ value: "edit", label: "编辑图形", icon: "edit" }] : []),
  { value: "preview", label: "查看图片", icon: "eye", disabled: !preview },
  { value: "layout", label: "图片对齐", icon: "alignLeft", kind: "menu", trigger: "disclosure", items: [
   { value: "align:left", label: "左对齐", icon: "alignLeft" }, { value: "align:center", label: "居中", icon: "alignCenter" }, { value: "align:right", label: "右对齐", icon: "alignRight" }
  ] },
  { value: "crop", label: "裁剪图片", icon: "crop", disabled: !preview },
  { value: "rotation", label: "旋转与翻转", icon: "rotateCw", kind: "menu", trigger: "disclosure", items: [
   { value: "rotate:right", label: "向右旋转 90°", icon: "rotateCw" }, { value: "rotate:left", label: "向左旋转 90°", icon: "rotateCcw" },
   { value: "flip:x", label: "水平翻转", icon: "flipHorizontal" }, { value: "flip:y", label: "垂直翻转", icon: "flipVertical" }
  ] },
  { value: "size", label: "图片尺寸", icon: "ruler" },
  ...(image ? [{ value: "replace", label: "替换图片", icon: "imageUp" }] : []),
  { value: "caption", label: "图片题注", icon: "captions" },
  { value: "delete", label: "删除图片", icon: "trash2" },
  { value: "more", label: "更多图片操作", icon: "moreHorizontal", kind: "menu", trigger: "disclosure", indicator: false, items: [
   { value: "link", label: linked ? "编辑图片链接…" : "添加图片链接…", icon: "link" },
   ...(linked ? [{ value: "open-link", label: "打开图片链接", icon: "externalLink" }] : []),
   { value: "metadata", label: "替代文本与图片信息…", icon: "settings" },
   { value: "reset-crop", label: "重置裁剪", icon: "scan" }, { value: "reset-transform", label: "重置旋转与翻转", icon: "refreshCw" },
   { value: "reset-size", label: "适应文档宽度", icon: "moveHorizontal" }
  ] }
 ];
}
