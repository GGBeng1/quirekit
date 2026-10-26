import type { FlowRelationPreset } from "./types";

/** Atomic, original ER relationship presets; labels and geometry remain independently editable. */
export const flowRelations: readonly FlowRelationPreset[] = [
  { value: "relation-association", label: "UML · 关联", path: "M6 12 H74", style: { sourceArrow: "none", targetArrow: "none", dashed: false } },
  { value: "relation-dependency", label: "UML · 依赖", path: "M6 12 H74", end: "open", dashed: true, style: { sourceArrow: "none", targetArrow: "open", dashed: true } },
  { value: "relation-generalization", label: "UML · 泛化", path: "M6 12 H74", end: "triangle-hollow", style: { sourceArrow: "none", targetArrow: "triangle-hollow", dashed: false } },
  { value: "relation-realization", label: "UML · 实现", path: "M6 12 H74", end: "triangle-hollow", dashed: true, style: { sourceArrow: "none", targetArrow: "triangle-hollow", dashed: true } },
  { value: "relation-aggregation", label: "UML · 聚合", path: "M6 12 H74", start: "diamond-hollow", style: { sourceArrow: "diamond-hollow", targetArrow: "none", dashed: false } },
  { value: "relation-composition", label: "UML · 组合", path: "M6 12 H74", start: "diamond", style: { sourceArrow: "diamond", targetArrow: "none", dashed: false } },
  { value: "relation-one-one", label: "ER · 一对一", path: "M6 12 H74", start: "er-one", end: "er-one", style: { sourceArrow: "er-one", targetArrow: "er-one", dashed: false } },
  { value: "relation-one-many", label: "ER · 一对多（1..N）", path: "M6 12 H74", start: "er-one", end: "er-one-many", style: { sourceArrow: "er-one", targetArrow: "er-one-many", dashed: false } },
  { value: "relation-one-optional", label: "ER · 一对零或多（0..N）", path: "M6 12 H74", start: "er-one", end: "er-zero-many", style: { sourceArrow: "er-one", targetArrow: "er-zero-many", dashed: false } },
  { value: "relation-many-many", label: "ER · 多对多", path: "M6 12 H74", start: "er-many", end: "er-many", style: { sourceArrow: "er-many", targetArrow: "er-many", dashed: false } },
];
