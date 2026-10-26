import type { QuireKitMenuEntry } from "@quirekit/ui";

/** @returns Existing edge-edit intents grouped under the unified line menu. */
export function flowEdgeEditItems(): readonly QuireKitMenuEntry[] {
  return [
    { value: "edge-route", label: "绕行通道", kind: "submenu", children: [
      { value: "edge-route-top", label: "从上方绕行" }, { value: "edge-route-bottom", label: "从下方绕行" },
      { value: "edge-route-left", label: "从左侧绕行" }, { value: "edge-route-right", label: "从右侧绕行" },
    ] },
    { value: "edge-label-avoid", label: "避让标签" },
    { value: "edge-label-placement", label: "标签沿线位置", kind: "submenu", children: [
      { value: "edge-label-start", label: "靠近起点" }, { value: "edge-label-middle", label: "路径居中" }, { value: "edge-label-end", label: "靠近终点" },
    ] },
    { value: "edge-label-side", label: "标签相对连线", kind: "submenu", children: [
      { value: "edge-label-above", label: "连线左侧 / 上方" }, { value: "edge-label-on", label: "在线上" }, { value: "edge-label-below", label: "连线右侧 / 下方" },
    ] },
    { value: "edge-label-reset", label: "重置标签位置" },
    { value: "edge-reset-bends", label: "重置折点" },
  ];
}
