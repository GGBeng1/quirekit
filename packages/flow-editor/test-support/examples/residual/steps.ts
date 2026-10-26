import type { FlowchartMotionEffect, FlowchartPlaybackStep, FlowchartRunChange, FlowchartRunState } from "@quirekit/flowchart";

/** @param id - Canonical identity mapper. @param t - Sample-owned localization. @returns Illustrative residual branches, source-preserving dimming and fixed-frame teaching steps. */
export function residualSteps(id: (name: string) => string, t: (text: string) => string): readonly FlowchartPlaybackStep[] {
  /** @param name - Exact path. @param delay - Logical offset. @param duration - Logical length. @returns Two short beams travelling on the real path. */
  const beam = (name: string, delay = 0, duration = 4300): FlowchartMotionEffect => ({ id: id(name), kind: "travel", payload: "beam", count: 2, delay, duration });
  /** @param name - Junction identity. @param delay - Logical offset. @returns Two expanding contour rings at a branch or sum. */
  const halo = (name: string, delay = 0): FlowchartMotionEffect => ({ id: id(name), kind: "pulse", halo: true, delay, duration: 4300 - delay });
  /** @param active - Current modules. @param completed - Completed modules. @returns Explicit sparse module states, dimming other addressed modules. */
  function modules(active: readonly string[] = [], completed: readonly string[] = []): readonly FlowchartRunChange[] {
    return ["norm-1", "attention", "norm-2", "ff"].map(name => ({ id: id(name), state: (active.includes(name) ? "running" : completed.includes(name) ? "completed" : "pending") as FlowchartRunState }));
  }
  return [
    { id: "skip-first", title: t("原输入走残差旁路"), description: t("模块和底线保持固定。短亮段绕过注意力模块，将原输入送到第一个相加节点。"), duration: 5000, changes: modules(), effects: [beam("input-path"), beam("skip-1", 200), halo("split-1"), halo("add-1", 600)] },
    { id: "attention-main", title: t("注意力结果与原输入相加"), description: t("归一化与多头注意力进入当前阶段。主干结果和保留的原输入在同一个节点汇合。"), duration: 5000, changes: modules(["norm-1", "attention"]), effects: [
      beam("skip-1"), beam("norm-1-path"), beam("attention-path", 300), beam("attention-add", 600), halo("add-1", 500), { id: id("attention"), kind: "pulse", duration: 4300 },
    ] },
    { id: "skip-second", title: t("新的表示继续保留旁路"), description: t("第一次相加的结果继续向上传递，也沿第二条旁路保留，供下一次残差相加使用。"), duration: 5000, changes: modules([], ["norm-1", "attention"]), effects: [beam("between"), beam("skip-2", 200), halo("split-2"), halo("add-2", 600)] },
    { id: "feed-forward", title: t("前馈变换与第二次相加"), description: t("归一化后的表示进入前馈网络。前馈结果和第二条旁路的信息相加，再交给后续 Block。"), duration: 5000, changes: modules(["norm-2", "ff"], ["norm-1", "attention"]), effects: [
      beam("skip-2"), beam("norm-2-path"), beam("ff-path", 300), beam("ff-add", 600), beam("output-path", 600), halo("add-2", 500), { id: id("ff"), kind: "pulse", duration: 4300 },
    ] },
    { id: "review", title: t("回看两次残差连接"), description: t("此图讲解 Pre-LN 单个 Block 的信息路径，省略矩阵计算、训练与完整模型层数。点重播可再次观察旁路与主干。"), duration: 2600, changes: modules([], ["norm-1", "attention", "norm-2", "ff"]), effects: [{ id: id("output"), kind: "pulse", duration: 2300 }] },
  ];
}
