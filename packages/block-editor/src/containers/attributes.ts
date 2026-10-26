import type { BlockContainerAttributes, BlockContainerKind, BlockContainerColor } from "./types";

/** Installed content roles, in product menu order. */
export const blockContainerKinds: readonly BlockContainerKind[] = ["highlight", "note", "warning", "details", "info", "tip", "important", "danger", "caution", "decision"];
/** Palette order aligned with the shared Prose highlight presentation. */
export const blockContainerColors: readonly BlockContainerColor[] = ["orange", "red", "green", "blue", "purple", "gray"];
/** Canonical defaults used by insertion and imported attributes. */
export const blockContainerDefaults: BlockContainerAttributes = { kind: "highlight", title: "", emoji: "📌", color: "orange", textColor: null };
/** User-facing labels for real container roles. */
export const blockContainerLabels: Readonly<Record<BlockContainerKind, string>> = {
  highlight: "高亮块", note: "提示块", warning: "警告块", details: "折叠块", info: "信息块", tip: "技巧块",
  important: "重要事项", danger: "危险提示", caution: "注意事项", decision: "决策块"
};
/** @param value - Untrusted or command-provided attributes. @returns Whether every specified field is supported and safe. */
export function validBlockContainerAttributes(value: Partial<BlockContainerAttributes>): boolean {
  return Object.entries(value).every(([key, item]) => {
    if (key === "kind") return blockContainerKinds.includes(item as BlockContainerKind);
    if (key === "color") return blockContainerColors.includes(item as BlockContainerColor);
    if (key === "textColor") return item === null || blockContainerColors.includes(item as BlockContainerColor);
    if (key === "title") return typeof item === "string" && item.length <= 240 && !/[\r\n\u0000]/u.test(item);
    if (key === "emoji") return typeof item === "string" && item.length <= 64 && !/[\s<>\u0000]/u.test(item);
    return false;
  });
}
/** @param kind - Canonical role. @returns Shared Prose tone without a product-specific paint palette. */
export function blockContainerTone(kind: string): string {
  if (["warning", "caution"].includes(kind)) return "warning";
  if (kind === "danger") return "danger";
  if (kind === "tip") return "success";
  return ["info", "note", "important", "decision"].includes(kind) ? "info" : "neutral";
}
