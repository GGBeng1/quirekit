import { readBlockTableFeature } from "../../table/feature";
import type { Editor } from "@quirekit/core";
import type { BlockInsertItem } from "./types";
import { readBlockListFeature } from "../../lists/feature";
import { readBlockEditorLocale } from "../../localization/runtime";
import { translateBlockText } from "../../localization/text";

/** One catalog for all product insertion entry points. */
const catalog: readonly Omit<BlockInsertItem, "icon" | "group">[] = [
  { id: "columns", label: "分栏", description: "并列编辑内容，拖动调整栏宽", keywords: "columns fenlan", node: "blockColumns", slash: true },
  { id: "template", label: "块模板", description: "复用常用写作结构", keywords: "template moban", node: "blockColumns", slash: true },
  { id: "webCard", label: "网页卡片", description: "链接、标题与说明", keywords: "bookmark web link wangye", node: "webCard", slash: true },
  { id: "embed", label: "网页嵌入", description: "在文档中打开网页预览", keywords: "embed iframe qianru", node: "webCard", slash: true },
  { id: "attachment", label: "附件", description: "添加可下载的文件", keywords: "file attachment fujian", node: "blockAsset", slash: true },
  { id: "audio", label: "音频", description: "插入音频并直接播放", keywords: "audio sound yinpin", node: "blockAsset", slash: true },
  { id: "video", label: "视频", description: "插入视频并直接播放", keywords: "video shipin", node: "blockAsset", slash: true },
  { id: "imageGallery", label: "多图", description: "图片排列与大图切换", keywords: "gallery images duotu", node: "imageGallery", slash: true },
  { id: "paragraph", label: "正文", description: "普通文本段落", keywords: "text paragraph zhengwen", node: "paragraph", slash: true },
  ...[1, 2, 3, 4, 5, 6].map(level => ({ id: `heading:${level}`, label: `标题 ${level}`, description: "组织章节并显示在目录中", keywords: `heading h${level} biaoti`, node: "heading", slash: true })),
  { id: "bulletList", label: "无序列表", description: "用项目符号整理要点", keywords: "bullet list w序 wuxu", node: "bulletList", slash: true },
  { id: "orderedList", label: "有序列表", description: "按顺序拆解步骤", keywords: "ordered number youxu", node: "orderedList", slash: true },
  { id: "blockquote", label: "引用", description: "突出引述或补充说明", keywords: "quote yinyong", node: "blockquote", slash: true },
  { id: "container:highlight", label: "高亮块", description: "用表情和颜色突出内容", keywords: "highlight callout container glk gaoliang", node: "blockContainer", slash: true },
  { id: "container:note", label: "提示块", description: "带标题的内容，可切换警告、信息等样式", keywords: "note info tip important warning danger caution decision container tishi 警告 信息 技巧 重要事项 危险提示 注意事项 决策", node: "blockContainer", slash: true },
  { id: "container:details", label: "折叠块", description: "收起或展开补充内容", keywords: "details collapse container zhedie", node: "blockContainer", slash: true },
  { id: "codeBlock", label: "代码块", description: "保留缩进的等宽文本", keywords: "code daima", node: "codeBlock", slash: true },
  { id: "footnoteReference", label: "脚注", description: "连接正文引用与可编辑注释", keywords: "footnote note jiaozhu", node: "footnoteReference", slash: true },
  { id: "definitionList", label: "定义列表", description: "术语及其解释", keywords: "definition term dingyi", node: "definitionList", slash: true },
  { id: "inlineDate", label: "日期", description: "可再次编辑的正文日期", keywords: "date calendar riqi", node: "inlineDate", slash: true },
  { id: "emoji", label: "表情", description: "插入表情文字", keywords: "emoji biaoqing", node: "inlineDate", slash: true },
  { id: "inlineMath", label: "行内公式", description: "在文字中插入可编辑公式", keywords: "math latex equation formula gongshi", node: "inlineMath", slash: true },
  { id: "displayMath", label: "块级公式", description: "独立一行的可编辑公式", keywords: "math latex equation formula gongshi", node: "displayMath", slash: true },
  { id: "horizontalRule", label: "分隔线", description: "分隔两个内容区域", keywords: "divider line fengexian", node: "horizontalRule", slash: true },
  { id: "image", label: "图片", description: "插入图片并调整尺寸", keywords: "image photo tupian", node: "image", slash: true },
  { id: "dataView", label: "多维表格", description: "带字段与视图的数据集合", keywords: "database data duowei", node: "dataView", slash: true },
  { id: "textDiagram", label: "文本绘图", description: "Mermaid、PlantUML 或 DOT", keywords: "mermaid plantuml dot code", node: "textDiagram", slash: true },
  { id: "flowchart", label: "流程图", description: "连接节点，表达业务流程", keywords: "flowchart liucheng", node: "flowchart", slash: true },
  { id: "mindMap", label: "思维导图", description: "从中心主题展开想法", keywords: "mind map siwei", node: "mindMap", slash: true },
  { id: "whiteboard", label: "白板", description: "自由绘制与空间排布", keywords: "whiteboard drawing baiban", node: "whiteboard", slash: true }
];

/** @param editor - Host schema. @param query - Search input. @param slash - Slash entry admission. @param locale - Reactive interface language. @returns Installed matching entries. */
export function blockInsertItems(editor: Editor, query = "", slash = false, locale = readBlockEditorLocale(editor)): readonly BlockInsertItem[] {
  const needle = query.trim().toLocaleLowerCase();
  const table = readBlockTableFeature(editor);
  const headingLevels = editor.extensions.find(extension => extension.name === "heading")?.options.levels;
  const entries = [...catalog, ...(readBlockListFeature(editor) ? [{ id: "taskList", label: "任务列表", description: "可勾选的待办事项", keywords: "task todo daiban renwu", node: "paragraph", slash: true }] : []), ...(table ? [{ id: "table", label: "普通表格", description: "单元格、行列和合并拆分", keywords: "table biaoge", node: table.nodeName, slash: true }] : [])];
  const icons: Readonly<Record<string, string>> = { columns: "columns2", template: "layoutDashboard", webCard: "globe", embed: "codeXml", attachment: "paperclip", audio: "headphones", video: "video", imageGallery: "images", footnoteReference: "superscript", definitionList: "listTree", inlineDate: "calendar", emoji: "smile", inlineMath: "sigma", displayMath: "superscriptSquare", image: "image", paragraph: "paragraph", bulletList: "listBullet", orderedList: "listNumbered", blockquote: "textQuote", codeBlock: "codeXml", horizontalRule: "horizontalRule", table: "table", dataView: "table", textDiagram: "textDiagram", flowchart: "workflow", mindMap: "mindMap", whiteboard: "whiteboard" };
  const projected = entries.map(item => ({ ...item, label: translateBlockText(locale, item.label), description: translateBlockText(locale, item.description),
    icon: item.id.startsWith("container:") ? item.id === "container:highlight" ? "lightbulb" : item.id === "container:details" ? "chevronRight" : "circleInfo" : item.id === "taskList" ? "listTask" : item.id.startsWith("heading:") ? item.id === "heading:1" ? "heading" : `heading${item.id.slice(8)}` : icons[item.id]!,
    group: ["columns", "template", "webCard", "embed"].includes(item.id) ? "布局与链接" : ["image", "imageGallery", "attachment", "audio", "video"].includes(item.id) ? "媒体与附件" : item.id.startsWith("container:") ? "容器与提示" : ["table", "codeBlock", "blockquote", "horizontalRule", "inlineMath", "displayMath"].includes(item.id) ? "常用内容" : ["image", "dataView", "textDiagram", "flowchart", "mindMap", "whiteboard"].includes(item.id) ? "图形与数据" : "文本与列表"
  }));
  return projected.filter(item => !!editor.state.schema.nodes[item.node] && (!slash || item.slash)
    && (!item.id.startsWith("heading:") || !Array.isArray(headingLevels) || headingLevels.includes(Number(item.id.slice(8))))
    && `${item.label} ${item.description} ${item.keywords}`.toLocaleLowerCase().includes(needle));
}
