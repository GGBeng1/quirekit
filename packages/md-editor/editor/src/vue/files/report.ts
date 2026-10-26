import type { MdDocxDiagnostic } from "../../docx/types";
import type { MdEditorLocale } from "../types";
import type { MdExporter } from "../../export/types";

const chinese: Readonly<Record<string, string>> = {
  "whiteboard-image-projected": "白板已转换为图片。重新导入时，仅附带可编辑源且图片未被修改的白板可恢复编辑。",
  "whiteboard-source-unavailable": "白板源缺失或图片已修改，保留当前图片，无法恢复白板编辑。",
  "round-trip-optional-metadata-omitted": "文件达到源数据大小上限，部分对象的可编辑源未保留；可见内容仍已导出，请保留原文档。",
  "math-unavailable": "公式无法完整转换，已保留源码或可读数学文字。",
  "math-approximated": "公式已转换为 Word 原生公式，部分不支持的细节已简化。",
  "container-appearance": "容器已转换为可编辑的 Word 底纹、边框和内边距；圆角和折叠交互不保留。",
  "container-source-omitted": "已关闭容器源码元数据，仅保留 Word 中的可编辑内容。",
  "container-source-unavailable": "容器元数据缺失或内容已修改，已保留 Word 中的当前内容。",
  "code-image-projected": "图表已转换为图片；启用源码元数据时可在重新导入后恢复编辑。",
  "code-image-unavailable": "图表图片生成失败，已保留原始代码。",
  "code-image-source-unavailable": "图表源码元数据缺失或图片已修改，已保留 Word 中的当前图片。",
  "codec:ROUND_TRIP_STALE": "Word 内容或样式已修改，对应的旧节点元数据不再用于恢复。",
  "codec:ROUND_TRIP_INVALID": "节点元数据无效或版本不受支持，已保留可见内容。",
  "codec:ROUND_TRIP_AMBIGUOUS": "节点标识或元数据重复，已保留可见内容。",
  "image-unavailable": "图片无法转换，已保留替代文字。",
  "image-formatting": "图片附带的文字格式或链接已省略。",
  "image-metadata": "图片的动画或方向元数据未解释，显示效果可能不同。",
  "image-layout": "图片转为行内图片；尺寸、浮动位置、变换和点击操作不保留。",
  "image-storage-failed": "图片保存失败，已保留内嵌图片数据。",
  "link-title": "链接的提示标题已省略。",
  "link-unavailable": "无效或不安全的链接已移除，显示文字保留。",
  "inline-source": "不支持的行内语法已保留为源码文字。",
  "block-source": "不支持的块语法已保留为源码。",
  "frontmatter-source": "文档元数据已保留为代码块。",
  "extension-source": "扩展语法已保留为源码文字。",
  "code-metadata": "代码块的附加参数已省略。",
  "diagram-source": "图表已保留为代码，未生成图形。",
  "diagram-preview": "图表已导出为预览图片，可编辑源码不保留。",
  "embed-placeholder": "无法转换的扩展块已替换为占位文字。",
  "container-quote": "容器已导出为引用块，容器类型与折叠交互不保留。",
  "template-ignored": "当前导出方式不应用导出样式，使用默认版式。",
  "quote-structure": "复杂引用的嵌套结构已简化。",
  "task-flattened": "任务完成状态已转为可见的勾选字符。",
  "list-paragraph": "列表项中的多个段落已合为带换行的文字。",
  "list-structure": "复杂或层级过深的列表内容已简化。",
  "list-format": "自定义编号已转为普通 Markdown 列表。",
  "list-level": "缺少父层级的列表已调整层级。",
  "footnote-flattened": "脚注或尾注已转为正文中的注释文字。",
  "footnote-repeated": "同一脚注的多次引用已分别转换为独立的 Word 脚注。",
  "footnote-unavailable": "脚注关联缺失或出现嵌套引用，已保留可读文字。",
  "note-content": "注释中的复杂内容已简化为文字或源码；基础段落和文字格式保留。",
  "endnote-position": "Word 尾注已转为 Markdown 脚注，不保留文末位置设置。",
  "revision-flattened": "修订已转为可见内容；可识别的删除文字不保留。",
  "text-formatting": "Markdown 无法表示的文字格式已省略。",
  "inline-flattened": "复杂行内对象已简化；无法读取的对象已省略。",
  "paragraph-layout": "Word 段落的排版属性已省略。",
  "heading-level": "标题级别已调整到 Markdown 支持的 1–6 级。",
  "document-layout": "页面设置或页眉页脚等内容已省略。",
  "block-flattened": "复杂块对象已简化；无法读取的对象已省略。",
  "table-merge": "合并单元格已展开，文字保留一次。",
  "table-header": "表格的第一行已作为 Markdown 表头。",
  "table-content": "单元格中的复杂内容已合为一行。",
  "table-alignment": "单元格对齐方式已按表头统一。",
  "table-line-break": "单元格中的换行已转为空格。",
  "table-formatting": "表格的 Word 排版、外观或审阅信息已省略。",
  "comments-omitted": "审阅批注未导入 Markdown 正文。",
  "document-projection": "仅保留支持的正文语义和通过校验的扩展节点。其他 Word 版式和文件元数据不保留，报告无法列出每个底层属性。",
};

/** @param diagnostics - Per-node report. @param locale - Product language. @param exporter - Installed format exporter; absent for Word.
 * @returns Grouped, readable descriptions without exposing internal AST paths. */
export function wordReport(diagnostics: readonly MdDocxDiagnostic[], locale: MdEditorLocale, exporter?: Pick<MdExporter, 'describeDiagnostic'>): string[] {
  const groups = new Map<string, number>();
  for (const item of diagnostics) {
    const message = exporter?.describeDiagnostic?.(item.code, locale)
      ?? (locale === "zh-CN" ? (item.code === "whiteboard-source-not-retained" ? item.message : chinese[item.code] ?? `文件解析提示：${item.message}`) : item.message);
    groups.set(message, (groups.get(message) ?? 0) + 1);
  }
  return [...groups].map(([message, count]) => count > 1 ? `${message} (${count})` : message);
}
