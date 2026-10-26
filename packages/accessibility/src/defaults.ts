import type { QuireAccessibilityOptions } from "./types";

/** Shared immutable defaults; applications can replace labels and semantic contributors. */
export const accessibilityDefaults: QuireAccessibilityOptions = {
  enabled: true,
  textBudget: 2048,
  readingBudget: 8192,
  readingBlocks: 40,
  labels: {
    input: "文档编辑（当前段落上下文）", reading: "阅读文档", returnToEditor: "返回编辑器",
    previous: "上一段阅读内容", next: "下一段阅读内容", edit: "编辑此段", empty: "空段落",
    continuation: "（段落续文）", unavailable: "当前范围暂不支持文本上下文或直接编辑。",
    unsupported: (name) => `此区块暂未提供阅读语义：${name}`,
    segment: (index, last) => `阅读分段 ${index}${last ? "，已到文档末尾" : "，后面还有内容"}`
  },
  describeBlock: (node) => node.isTextblock ? { kind: "paragraph" } : null
};
