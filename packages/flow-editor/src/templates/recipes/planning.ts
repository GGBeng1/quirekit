import { buildRecipe } from "./build";

/** @returns An editable milestone diagram, without automatic scheduling semantics. */
export function timelineRecipe() { return buildRecipe([
  ["title", "text", 300, 0, "项目里程碑", "slate", 300, 50],
  ["discover", "arrow-right", 0, 150, "01 调研", "blue", 200, 110], ["design", "arrow-right", 260, 150, "02 设计", "purple", 200, 110],
  ["build", "arrow-right", 520, 150, "03 开发", "orange", 200, 110], ["release", "arrow-right", 780, 150, "04 发布", "green", 200, 110],
  ["goals", "note", 0, 330, "明确需求与目标", "blue", 200, 90], ["prototype", "note", 260, 330, "验证关键交互", "purple", 200, 90],
  ["quality", "note", 520, 330, "实现与质量检查", "orange", 200, 90], ["feedback", "note", 780, 330, "跟踪反馈与指标", "green", 200, 90],
], [["discover", "design", "", "right", "left"], ["design", "build", "", "right", "left"], ["build", "release", "", "right", "left"], ["discover", "goals"], ["design", "prototype"], ["build", "quality"], ["release", "feedback"]]); }

/** @returns A fixed-position PDCA cycle with editable steps and arrows. */
export function improvementRecipe() { return buildRecipe([
  ["plan", "process", 270, 0, "Plan · 制定计划", "blue", 200, 80], ["do", "process", 540, 190, "Do · 执行方案", "green", 200, 80],
  ["check", "process", 270, 380, "Check · 检查结果", "orange", 200, 80], ["act", "process", 0, 190, "Act · 调整改进", "purple", 200, 80],
  ["center", "text", 270, 200, "持续改进", "slate", 200, 60],
], [["plan", "do", "", "right", "top", [{ x: 640, y: 40 }]], ["do", "check", "", "bottom", "right", [{ x: 640, y: 420 }]], ["check", "act", "", "left", "bottom", [{ x: 100, y: 420 }]], ["act", "plan", "", "top", "left", [{ x: 100, y: 40 }]]]); }

/** @returns A simple collaboration map with original role descriptions. */
export function teamRecipe() { return buildRecipe([
  ["goal", "ellipse", 300, 180, "共同目标", "purple", 180, 100], ["product", "process", 0, 0, "产品 · 需求与优先级"],
  ["design", "process", 600, 0, "设计 · 体验与规范", "purple"], ["engineering", "process", 0, 380, "研发 · 实现与交付", "green"],
  ["quality", "process", 600, 380, "质量 · 验证与反馈", "orange"], ["note", "callout", 570, 175, "定期同步\n及时反馈", "slate", 180, 110],
], [["product", "goal", "", "bottom", "top"], ["design", "goal", "", "bottom", "top"], ["goal", "engineering", "", "bottom", "top"], ["goal", "quality", "", "bottom", "top"]]); }
