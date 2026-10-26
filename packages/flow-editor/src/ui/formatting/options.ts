import { flowRelations } from "./relations";
import type { FlowchartArrow } from "@quirekit/flowchart";
import type { FlowchartSelectionStyle } from "@quirekit/flowchart-x6";
import type { FlowStyleGroup, FlowStyleOption } from "./types";

const line = "M6 12 H74";
const paths: readonly FlowStyleOption[] = [
  { value: "connection-straight", label: "直线", path: "M6 19 L74 5" },
  { value: "connection-sharp", label: "直角折线", path: "M6 19 H40 V5 H74" },
  { value: "connection-rounded", label: "圆角折线", path: "M6 19 H33 Q40 19 40 12 Q40 5 47 5 H74" },
  { value: "connection-smooth", label: "平滑曲线", path: "M6 19 C45 19 35 5 74 5" },
];
const dashes: readonly FlowStyleOption[] = [
  { value: "line-solid", label: "实线", path: line }, { value: "line-dashed", label: "虚线", path: line, dashed: true },
];
const widths: readonly FlowStyleOption[] = [
  { value: "weight-1", label: "细线 · 1 px", path: line, width: 1 },
  { value: "weight-1.5", label: "默认 · 1.5 px", path: line, width: 1.5 },
  { value: "weight-2", label: "中线 · 2 px", path: line, width: 2 },
  { value: "weight-3", label: "粗线 · 3 px", path: line, width: 3 },
];
const crossings: readonly FlowStyleOption[] = [
  { value: "crossing-none", label: "普通交叉", path: "M40 2 V22 M6 12 H74" },
  { value: "crossing-jump", label: "跨线弧", path: "M40 2 V22 M6 12 H34 C34 4 46 4 46 12 H74" },
  { value: "crossing-gap", label: "交叉处断开", path: "M40 2 V22 M6 12 H34 M46 12 H74" },
];
const arrows: readonly FlowStyleOption[] = [
  { value: "arrow-block", label: "单向箭头", path: line, end: "block" },
  { value: "arrow-both", label: "双向箭头", path: line, start: "block", end: "block" },
  { value: "arrow-open", label: "开放箭头", path: line, end: "open" },
  { value: "arrow-diamond", label: "菱形端点", path: line, end: "diamond" },
  { value: "arrow-circle", label: "圆形端点", path: line, end: "circle" },
  { value: "arrow-none", label: "无箭头", path: line },
];

/** @param kind - Requested visual menu. @param style - Common effective selection properties. @returns Sections with truthful radio values, including mixed/custom combinations. */
export function flowStyleGroups(kind: string, style: FlowchartSelectionStyle): readonly FlowStyleGroup[] {
  if (kind === "arrows") {
    const selected = style.sourceArrow === "block" && style.targetArrow === "block" ? "arrow-both"
      : style.sourceArrow === "none" && style.targetArrow !== null ? `arrow-${style.targetArrow}` : "";
    const endpoints: readonly (readonly [FlowchartArrow, string])[] = [["none", "无端点"], ["block", "实心箭头"], ["open", "开放箭头"], ["diamond", "实心菱形"], ["circle", "圆形"], ["triangle-hollow", "空心三角"], ["diamond-hollow", "空心菱形"],
      ["er-one", "ER · 1"], ["er-many", "ER · N"], ["er-zero-one", "ER · 0..1"], ["er-one-many", "ER · 1..N"], ["er-zero-many", "ER · 0..N"]];
    return [{ value: "arrows", label: "常用箭头", options: arrows, selected },
      { value: "relations", label: "关系预设", options: flowRelations, selected: flowRelations.find(r => r.style.sourceArrow === style.sourceArrow && r.style.targetArrow === style.targetArrow && r.style.dashed === style.dashed)?.value ?? "" }, ...(["source", "target"] as const).map(side => ({
      value: side, label: side === "source" ? "起点" : "终点", selected: `endpoint-${side}-${side === "source" ? style.sourceArrow : style.targetArrow}`,
      options: endpoints.map(([value, label]) => ({ value: `endpoint-${side}-${value}`, label: `${side === "source" ? "起点" : "终点"} · ${label}`, path: line, [side === "source" ? "start" : "end"]: value })),
    }))];
  }
  const path = style.routing === "straight" && style.connector === "sharp" ? "straight"
    : style.routing === "straight" && style.connector === "smooth" ? "smooth"
    : style.routing === "orthogonal" && (style.connector === "sharp" || style.connector === "rounded") ? style.connector : "";
  return [
    { value: "path", label: "连线路径", options: paths, selected: path ? `connection-${path}` : "" },
    { value: "crossing", label: "交叉线 · 曲线切回折线", options: crossings, selected: style.crossing === null ? "" : `crossing-${style.crossing}` },
    { value: "dash", label: "线型", options: dashes, selected: style.dashed === null ? "" : style.dashed ? "line-dashed" : "line-solid" },
    { value: "width", label: "线宽", options: widths, selected: style.width === null ? "" : `weight-${style.width}` },
  ];
}
