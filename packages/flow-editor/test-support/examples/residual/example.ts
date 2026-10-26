import { createFlowchart, createFlowchartNode, readFlowchart, readFlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEdge, FlowchartNode, FlowchartPort, FlowchartShape } from "@quirekit/flowchart";
import { exampleText } from "../messages";
import type { FlowchartPlaybackExample } from "../types";
import { residualSteps } from "./steps";

/** @param locale - New sample text language. @param prefix - Stable canonical identity namespace. @returns An editable Pre-LN block with fixed content, residual beams and node halos; no model telemetry. */
export function createFlowchartResidualExample(locale = "zh-CN", prefix = "residual"): FlowchartPlaybackExample {
  const nodes: FlowchartNode[] = [], edges: FlowchartEdge[] = [];
  /** @param text - Sample-owned literal. @returns Localized teaching copy. */
  const t = (text: string) => exampleText(locale, text);
  /** @param name - Local target. @returns Canonical identity. */
  const id = (name: string) => `${prefix}-${name}`;
  /** @param name - Identity. @param shape - Existing canonical symbol. @param text - Editable caption. @param x - World x. @param y - World y. @param width - World width. @param height - World height. @param color - Module accent. Adds a native node. */
  function node(name: string, shape: FlowchartShape, text: string, x: number, y: number, width: number, height: number, color = "#64748b"): void {
    nodes.push({ ...createFlowchartNode(id(name), shape, { x, y }, t(text)), width, height, ...(name === "frame" || shape === "text" ? {} : { parent: id("frame") }),
      style: { stroke: color, fontSize: 14, bold: true, ...(["attention", "ff", "norm-1", "norm-2"].includes(name) ? { color } : {}), ...(name === "frame" ? { textAlign: "left" as const } : {}) } });
  }
  /** @param name - Identity. @param from - Source node. @param to - Destination node. @param sourcePort - Native source port. @param targetPort - Native target port. @param vertices - World-space bypass corners. @param label - Optional editable connector caption. Adds one real rounded connector. */
  function edge(name: string, from: string, to: string, sourcePort: FlowchartPort = "top", targetPort: FlowchartPort = "bottom", vertices: readonly { x: number; y: number }[] = [], label = ""): void {
    edges.push({ id: id(name), source: { node: id(from), port: sourcePort }, target: { node: id(to), port: targetPort }, vertices, routing: "straight", connector: "rounded", label: t(label), labelPosition: .5,
      style: { stroke: "#94a3b8", width: 1.5, targetArrow: "open" } });
  }
  node("frame", "container", "Transformer Block · Pre-LN", 110, 60, 420, 700, "#cbd5e1");
  node("output", "process", "输出向量", 244, 0, 132, 42);
  node("add-2", "or-junction", "", 298, 132, 24, 24);
  node("ff", "process", "前馈网络\nFeed Forward", 219, 192, 182, 60, "#8b5cf6");
  node("norm-2", "process", "归一化 · Norm", 219, 278, 182, 32, "#10b981");
  node("split-2", "circle", "", 300, 338, 20, 20);
  node("add-1", "or-junction", "", 298, 386, 24, 24);
  node("attention", "process", "多头注意力\nMulti-Head Attention", 219, 446, 182, 60, "#f59e0b");
  node("norm-1", "process", "归一化 · Norm", 219, 532, 182, 32, "#10b981");
  node("split-1", "circle", "", 300, 592, 20, 20);
  node("input", "process", "输入向量", 244, 646, 132, 44);
  node("note", "text", "教学示意 · 两次残差相加 · 不代表模型实测", 20, 784, 600, 32);
  for (const [name, from, to] of [["input-path", "input", "split-1"], ["norm-1-path", "split-1", "norm-1"], ["attention-path", "norm-1", "attention"], ["attention-add", "attention", "add-1"],
    ["between", "add-1", "split-2"], ["norm-2-path", "split-2", "norm-2"], ["ff-path", "norm-2", "ff"], ["ff-add", "ff", "add-2"], ["output-path", "add-2", "output"]] as const) edge(name, from, to);
  edge("skip-1", "split-1", "add-1", "right", "right", [{ x: 467, y: 602 }, { x: 467, y: 398 }], "残差 · 原输入");
  edge("skip-2", "split-2", "add-2", "right", "right", [{ x: 467, y: 348 }, { x: 467, y: 144 }], "残差 · 原输入");
  const document = readFlowchart({ ...createFlowchart(), nodes, edges }), targets = new Set([...nodes, ...edges].map(item => item.id)), paths = new Set(edges.map(item => item.id));
  return { document, trace: readFlowchartPlaybackTrace({ title: t("残差连接原理动画"), presentation: "motion", steps: residualSteps(id, t) }, (target, kind) => kind ? paths.has(target) : targets.has(target)) };
}
