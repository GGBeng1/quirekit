import { createFlowchart, createFlowchartNode, readFlowchart, readFlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEdge, FlowchartNode, FlowchartPlaybackStep, FlowchartRunChange, FlowchartRunState } from "@quirekit/flowchart";
import { exampleText } from "./messages";
import type { FlowchartPlaybackExample } from "./types";

/** @param locale - Language of newly generated content. @param prefix - Unique graph identity prefix. @returns Editable graph and an explicitly illustrative late-reference sequence. */
export function createFlowchartPlaybackExample(locale = "zh-CN", prefix = "reference-run"): FlowchartPlaybackExample {
  /** @param source - Feature-owned sample copy. @returns Localized literal. */
  const t = (source: string) => exampleText(locale, source);
  /** @param name - Local sample identity. @returns Exact node/edge identity in this graph. */
  const id = (name: string) => `${prefix}-${name}`;
  const nodes: FlowchartNode[] = [
    { ...createFlowchartNode(id("input"), "data", { x: 0, y: 70 }, t("接收新片段")), width: 140, height: 72 },
    { ...createFlowchartNode(id("parse"), "process", { x: 205, y: 70 }, t("增量语法解析")), width: 150, height: 72 },
    { ...createFlowchartNode(id("check"), "decision", { x: 410, y: 55 }, t("引用依赖\n变化？")), width: 160, height: 102 },
    { ...createFlowchartNode(id("affected"), "process", { x: 635, y: -15 }, t("更新受影响块")), width: 160, height: 72 },
    { ...createFlowchartNode(id("reused"), "database", { x: 635, y: 175 }, t("复用未变块")), width: 160, height: 92 },
    { ...createFlowchartNode(id("render"), "process", { x: 855, y: 70 }, t("更新显示")), width: 140, height: 72 },
    { ...createFlowchartNode(id("definition"), "note", { x: 205, y: 260 }, t("后置引用定义\n[guide]: /docs")), width: 190, height: 92 },
  ];
  /** @param name - Connector name. @param from - Origin node. @param to - Destination node. @param label - Optional sample caption. @returns Canonical directed connector. */
  function edge(name: string, from: string, to: string, label = ""): FlowchartEdge {
    return { id: id(name), source: { node: id(from), port: from === "definition" ? "top" : "right" }, target: { node: id(to), port: from === "definition" ? "bottom" : "left" },
      vertices: [], routing: "straight", connector: "smooth", label: t(label), labelPosition: 0.5, style: { targetArrow: "open", width: 2 } };
  }
  const edges = [edge("incoming", "input", "parse"), edge("parsed", "parse", "check"), edge("changed", "check", "affected", "发生变化"),
    edge("unchanged", "check", "reused", "保持有效"), edge("paint", "affected", "render"), edge("retain", "reused", "render"), edge("definition-edge", "definition", "check")];
  /** @param state - Transient semantic state. @param names - Exact sample targets. @returns Sparse state deltas. */
  const changes = (state: FlowchartRunState, ...names: string[]): FlowchartRunChange[] => names.map(name => ({ id: id(name), state }));
  const steps: FlowchartPlaybackStep[] = [
    { id: "ready", title: t("准备处理"), description: t("先看完整的数据路径。这个示例使用预设步骤讲解，不是解析器的实测轨迹。"), changes: [...nodes, ...edges].map(target => ({ id: target.id, state: "pending" })) },
    { id: "incoming", title: t("新片段进入"), description: t("新内容进入语法解析，同时保留上一轮已有的显示结果。"), changes: changes("running", "input", "incoming") },
    { id: "parse", title: t("增量解析"), description: t("解析新增内容；语法复用与显示复用分别判断。"), changes: [...changes("completed", "input", "incoming"), ...changes("running", "parse", "parsed"), ...changes("reused", "reused")] },
    { id: "definition", title: t("引用定义到达"), description: t("后置定义为先前的引用提供目标，需要重新检查相关语义依赖。"), changes: [...changes("completed", "parse", "parsed"), ...changes("running", "definition", "definition-edge", "check")] },
    { id: "invalidate", title: t("标记受影响部分"), description: t("命中变化分支；受影响块的旧结果失效，其他块仍可复用。"), changes: [...changes("completed", "definition", "definition-edge", "check"), ...changes("running", "changed"), ...changes("invalid", "affected"), ...changes("reused", "reused", "unchanged")] },
    { id: "recompute", title: t("重算与复用"), description: t("只重算受影响部分，并将可复用结果传向显示阶段。"), changes: [...changes("completed", "changed"), ...changes("running", "affected", "paint", "retain"), ...changes("reused", "reused")] },
    { id: "render", title: t("同步显示"), description: t("将更新后的内容与复用内容汇合，呈现本轮接受的结果。"), changes: [...changes("completed", "affected", "paint", "retain"), ...changes("running", "render")] },
    { id: "complete", title: t("本轮完成"), description: t("已更新的块与复用的块分别保留状态。可以重播，或逐步查看每个阶段。"), changes: changes("completed", "render") },
  ];
  const document = readFlowchart({ ...createFlowchart(), nodes, edges }), targets = new Set([...nodes, ...edges].map(target => target.id));
  return Object.freeze({ document, trace: readFlowchartPlaybackTrace({ title: t("后置引用解析"), steps }, target => targets.has(target)) });
}
