import { createFlowchart, createFlowchartNode, createFlowchartImageNode, readFlowchart, readFlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEdge, FlowchartNode } from "@quirekit/flowchart";
import { exampleText } from "../messages";
import type { FlowchartPlaybackExample } from "../types";
import { attentionVector } from "./assets";
import { attentionSteps } from "./steps";

/** @param locale - Newly generated teaching text. @param prefix - Canonical identity prefix. @returns Editable attention illustration and parallel data choreography, without running a model. */
export function createFlowchartAttentionExample(locale = "zh-CN", prefix = "attention"): FlowchartPlaybackExample {
  /** @param text - Sample-owned literal. @returns Localized content. */
  const t = (text: string) => exampleText(locale, text);
  /** @param name - Local target. @returns Stable graph identity. */
  const id = (name: string) => `${prefix}-${name}`;
  const nodes: FlowchartNode[] = [], edges: FlowchartEdge[] = [];
  /** @param name - Target. @param text - Caption. @param x - World x. @param y - World y. @param width - Caption width. Adds an unframed label. */
  function label(name: string, text: string, x: number, y: number, width: number): void { nodes.push({ ...createFlowchartNode(id(name), "text", { x, y }, t(text)), width, height: 32, style: { fontSize: 13, bold: true } }); }
  /** @param name - Connector name. @param from - Exact source. @param to - Exact destination. @param color - Channel color. Adds a real editable path. */
  function edge(name: string, from: string, to: string, color = "#94a3b8"): void {
    edges.push({ id: id(name), source: { node: id(from), port: "right" }, target: { node: id(to), port: "left" }, vertices: [], routing: "straight", connector: "smooth", label: "", labelPosition: .5, style: { stroke: color, width: 1, targetArrow: "none" } });
  }
  const colors = ["#6366f1", "#0ea5e9", "#10b981"], values = [.25, -.65, .8, -.2, .5, -.8, .35, .9];
  label("title", "自注意力 · 数据流示意", 290, -25, 520);
  label("tokens-title", "词元", 0, 50, 84); label("embedding-title", "向量表示", 175, 50, 112);
  for (const i of [0, 1, 2]) {
    const y = 110 + i * 85;
    nodes.push({ ...createFlowchartNode(id(`token-${i}`), "process", { x: 0, y }, ["The", "cat", "sat"][i]!), width: 84, height: 42, style: { fill: "#f8fafc", stroke: "#cbd5e1", color: "#334155", fontSize: 15 } });
    nodes.push({ ...createFlowchartImageNode(id(`embed-${i}`), attentionVector(values.map((v, c) => v * (1 - .12 * i + .03 * c)), colors[0]!), { x: 175, y }), width: 112, height: 44 }); edge(`embed-edge-${i}`, `token-${i}`, `embed-${i}`);
    for (const [c, channel] of ["q", "k", "v"].entries()) {
      nodes.push({ ...createFlowchartImageNode(id(`${channel}-${i}`), attentionVector(values.map((v, k) => v * (1 - .12 * c - .05 * i + .01 * k)), colors[c]!), { x: 395, y: 72 + c * 134 + i * 36 }), width: 112, height: 34 });
      edge(`${channel}-edge-${i}`, `embed-${i}`, `${channel}-${i}`, `${colors[c]}`);
    }
  }
  label("q-title", "Q · 查询", 388, 40, 124); label("k-title", "K · 键", 388, 174, 124); label("v-title", "V · 值", 388, 308, 124);
  label("scores-title", "注意力权重", 585, 75, 180); label("formula", "softmax(QKᵀ / √d)", 570, 110, 210);
  const weights = [[1, 0, 0], [.35, .65, 0], [.15, .55, .3]];
  for (const r of [0, 1, 2]) for (const c of [0, 1, 2]) {
    const masked = c > r, value = weights[r]![c]!;
    nodes.push({ ...createFlowchartNode(id(`weight-${r}-${c}`), "process", { x: 572 + c * 68, y: 151 + r * 40 }, masked ? "—" : value.toFixed(2)), width: 62, height: 36,
      style: { fill: masked ? "#f1f5f9" : `#${[235 - Math.round(value * 90), 235 - Math.round(value * 125), 255].map(v => v.toString(16).padStart(2, "0")).join("")}`, stroke: "#e2e8f0", color: "#334155", fontSize: 11 } });
  }
  edge("query-score", "q-1", "weight-0-0", colors[0]); edge("key-score", "k-1", "weight-1-0", colors[1]);
  label("sum-title", "加权汇合", 808, 110, 132);
  for (const i of [0, 1, 2]) {
    nodes.push({ ...createFlowchartImageNode(id(`result-${i}`), attentionVector(values.map((v, c) => v * (.55 + .04 * i + .02 * c)), "#6366f1"), { x: 820, y: 155 + i * 57 }), width: 112, height: 44 });
    nodes.push({ ...createFlowchartNode(id(`out-${i}`), "process", { x: 1030, y: 155 + i * 57 }, ["The′", "cat′", "sat′"][i]!), width: 84, height: 42, style: { fill: "#eef2ff", stroke: "#a5b4fc", color: "#4338ca", fontSize: 15 } });
    edge(`result-edge-${i}`, `result-${i}`, `out-${i}`, colors[0]);
  }
  edge("score-output", "weight-2-2", "result-1", colors[1]); edge("value-output", "v-1", "result-1", colors[2]);
  label("out-title", "上下文表示", 1005, 110, 134);
  nodes.push({ ...createFlowchartNode(id("note"), "text", { x: 140, y: 466 }, t("教学示意 · 一个注意力头 · 数值非模型实测")), width: 900, height: 34, style: { fontSize: 12, color: "#64748b" } });
  const document = readFlowchart({ ...createFlowchart(), nodes, edges }), targets = new Set([...nodes, ...edges].map(item => item.id));
  const hidden = [...nodes.filter(node => node.shape === "image" || node.id.includes("-weight-") || /-out-[012]$/u.test(node.id)).map(node => node.id), ...edges.map(edge => edge.id)];
  return { document, trace: readFlowchartPlaybackTrace({ title: t("自注意力原理动画"), presentation: "motion", hidden, steps: attentionSteps(id, t) }, target => targets.has(target)) };
}
