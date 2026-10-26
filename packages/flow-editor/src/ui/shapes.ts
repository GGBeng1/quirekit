import { shapeGeometry } from "@quirekit/flowchart-x6";
import type { FlowchartShape } from "@quirekit/flowchart";

/** Compact, original labels grouped by authoring intent. */
const groups = [
  { label: "基础图形", entries: [
    ["rectangle", "矩形"], ["process", "处理"], ["circle", "圆形"], ["ellipse", "椭圆"], ["triangle", "三角形"],
    ["right-triangle", "直角三角形"], ["pentagon", "五边形"], ["hexagon", "六边形"], ["octagon", "八边形"],
    ["trapezoid", "梯形"], ["star", "五角星"], ["plus", "十字形"], ["cloud", "云形"], ["note", "便笺"],
  ] },
  { label: "流程图", entries: [
    ["terminator", "开始 / 结束"], ["decision", "判断"], ["data", "输入 / 输出"], ["document", "文档"], ["multi-document", "多文档"],
    ["subprocess", "子流程"], ["database", "数据库"], ["manual-input", "手动输入"], ["manual-operation", "手动操作"],
    ["stored-data", "存储数据"], ["internal-storage", "内部存储"], ["delay", "延迟"], ["display", "显示"], ["off-page", "跨页连接"],
    ["sort", "排序"], ["summing-junction", "求和连接"], ["or-junction", "或连接"], ["merge", "合并"],
  ] },
  { label: "架构、设备与建模", entries: [["actor", "人物"], ["server", "服务器"], ["browser", "浏览器"], ["mobile", "移动设备"], ["component", "组件"], ["package", "包 / 文件夹"], ["queue", "消息队列"], ["er-entity", "ER 实体"], ["uml-class", "UML 类"]] },
  { label: "块箭头", entries: [["arrow-right", "向右箭头"], ["arrow-left", "向左箭头"], ["arrow-up", "向上箭头"], ["arrow-down", "向下箭头"], ["arrow-horizontal", "水平双向箭头"], ["arrow-vertical", "垂直双向箭头"]] },
  { label: "文字与标注", entries: [["text", "自由文字"], ["callout", "标注气泡"], ["bracket-left", "左方括号"], ["bracket-right", "右方括号"], ["brace", "大括号"]] },
] as const satisfies readonly { readonly label: string; readonly entries: readonly (readonly [FlowchartShape, string])[] }[];

/** Palette paths use the same local contour as canvas nodes; text uses a typographic insertion glyph. */
export const flowShapeGroups = groups.map(group => ({ label: group.label, shapes: group.entries.map(([shape, label]) => {
  const vertical = ["arrow-up", "arrow-down", "arrow-vertical", "actor", "mobile", "bracket-left", "bracket-right", "brace"].includes(shape);
  const geometry = shapeGeometry({ shape, width: vertical ? 50 : 100, height: vertical ? 100 : 64 });
  return { shape, label, outline: shape === "text" ? "M24 8 H76 M50 8 V56 M36 56 H64" : geometry.visible ? geometry.outline : "",
    detail: geometry.detail, viewBox: vertical ? "-4 -4 58 108" : "-4 -4 108 72" };
}) }));
