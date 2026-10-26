import type { FlowchartRunState } from "@quirekit/flowchart";

/** Distinct, non-interactive state glyphs, also explained by the visible legend. */
export const runSymbols: Readonly<Record<FlowchartRunState, string>> = {
  pending: "M3 7h.01 M7 7h.01 M11 7h.01",
  running: "M4 2l7 5-7 5Z",
  completed: "M2 7l3 3 7-7",
  reused: "M2 6a5 5 0 0 1 9-3 M11 1v3H8 M12 8a5 5 0 0 1-9 3 M3 13v-3h3",
  invalid: "M3 3l8 8 M11 3l-8 8",
};
/** Short source keys localized by the native adapter and product UI separately. */
export const runLabels: Readonly<Record<FlowchartRunState, string>> = { pending: "待处理", running: "处理中", completed: "完成", reused: "复用", invalid: "失效" };
