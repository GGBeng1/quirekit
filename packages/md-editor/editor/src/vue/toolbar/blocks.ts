import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";

/** @param locale - Language for new, explicitly inserted content. @returns Representative canonical Markdown blocks. */
export function insertionBlocks(locale: MdEditorLocale) {
  const text = mdEditorMessages[locale], en = locale === "en";
  return [
    { id: "quote", feature: "blockquote", label: text.quote, source: `> ${en ? "A thought worth keeping." : "值得记住的一句话。"}` },
    { id: "list", feature: "listMarkers", label: text.list, source: en ? "- First item\n  - Nested item\n- Second item" : "- 第一项\n  - 嵌套项\n- 第二项" },
    { id: "ordered", feature: "listMarkers", label: text.ordered, source: en ? "1. First step\n2. Second step" : "1. 第一步\n2. 第二步" },
    { id: "task", feature: "taskItem", label: text.task, source: en ? "- [ ] A new task\n- [x] Completed task" : "- [ ] 新的任务\n- [x] 已完成的任务" },
    { id: "table", feature: "table", label: text.table, source: en ? "| Item | Status |\n| --- | --- |\n| Documentation | Ready |" : "| 项目 | 状态 |\n| --- | --- |\n| 文档 | 已就绪 |" },
    { id: "code", feature: "code-block", label: text.code, source: '```typescript\nconst message = "Hello, Markdown"\n```' },
    { id: "note", feature: "customContainer", label: text.note, source: `::: note ${en ? "A useful note" : "温馨提示"}\n${en ? "Write your explanation here." : "在这里补充说明。"}\n:::` },
    { id: "warning", feature: "customContainer", label: text.warning, source: `::: warning ${en ? "Before you continue" : "继续之前"}\n${en ? "Check the important details." : "确认关键事项后再继续。"}\n:::` },
    { id: "details", feature: "customContainer", label: text.details, source: `::: details ${en ? "More information" : "更多信息"}\n${en ? "Additional context lives here." : "在这里补充详细内容。"}\n:::` },
    { id: "highlight", feature: "customContainer", label: text.highlightBlock, source: `::: highlight {emoji=📌 color=orange}\n${en ? "Highlight what matters here." : "在这里写下需要突出的内容。"}\n:::` },
    { id: "nested", feature: "customContainer", label: text.nested, source: `:::: note ${en ? "Release plan" : "发布计划"}\n${en ? "The outer block remains editable." : "外层正文可以继续编辑。"}\n\n::: warning ${en ? "Before release" : "发布前检查"}\n- [ ] ${en ? "Check the rollback plan" : "确认回滚方案"}\n:::\n::::` },
    // Asterisks remain a divider at document start, where --- can open YAML metadata.
    { id: "divider", feature: "horizontalRule", label: text.divider, source: "***" },
    { id: "definition", feature: "definitionList", label: text.definition, source: en ? "Markdown\n: The source is always yours.\n\nProse\n: A shared document language." : "Markdown\n: 源码始终属于你。\n\nProse\n: 一套共用的文档样式。" },
  ];
}

/** @param locale - New diagram content language. @returns Starting Mermaid flowchart for a new text diagram; other languages come from the workspace templates. */
export function textDiagramTemplate(locale: MdEditorLocale): string {
  return locale === "en" ? "flowchart LR\n  A[Idea] --> B[Draft]\n  B --> C[Review]\n  C --> D[Publish]" : "flowchart LR\n  A[想法] --> B[草稿]\n  B --> C[审阅]\n  C --> D[发布]";
}
