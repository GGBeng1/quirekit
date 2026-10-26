import { createFlowchart, createFlowchartNode, instantiateFlowchart, readFlowchart, type FlowchartDocument, type FlowchartEdge } from "@quirekit/flowchart";
import type { FlowchartTemplateId } from "./types";
import { createSketchTemplate } from "./sketch";

/** @param id - Template name. @param prefix - Unique instance prefix. @returns A real editable template with fresh identities. */
export function createLegacyTemplate(id: FlowchartTemplateId, prefix: string): FlowchartDocument {
  if (id === "blank") return createFlowchart();
  if (id === "sketch") return instantiateFlowchart(createSketchTemplate(), prefix);
  const nodes = id === "approval" ? [
    createFlowchartNode("start", "terminator", { x: 300, y: 40 }, "开始"),
    createFlowchartNode("draft", "process", { x: 300, y: 164 }, "编写内容"),
    createFlowchartNode("review", "decision", { x: 300, y: 290 }, "审核通过？"),
    createFlowchartNode("revise", "process", { x: 40, y: 308 }, "修改内容"),
    createFlowchartNode("publish", "process", { x: 300, y: 462 }, "发布内容"),
    createFlowchartNode("end", "terminator", { x: 300, y: 590 }, "完成"),
  ] : [
    createFlowchartNode("start", "terminator", { x: 40, y: 160 }, "开始"),
    createFlowchartNode("input", "data", { x: 290, y: 160 }, "收集数据"),
    createFlowchartNode("process", "process", { x: 540, y: 160 }, "处理与分析"),
    createFlowchartNode("report", "document", { x: 790, y: 160 }, "输出报告"),
  ];
  const edges: FlowchartEdge[] = [];
  /** @param from - Source node. @param to - Target node. @param label - Literal condition. @param side - Horizontal branch. */
  function link(from: string, to: string, label = "", side = false): void {
    const horizontal = id === "pipeline";
    edges.push({ id: `e${edges.length}`, source: { node: from, port: side ? "left" : horizontal ? "right" : "bottom" },
      target: { node: to, port: side ? "right" : horizontal ? "left" : "top" }, vertices: [], routing: "orthogonal", label, labelPosition: 0.5, style: {} });
  }
  if (id === "approval") {
    link("start", "draft"); link("draft", "review"); link("review", "publish", "是");
    link("review", "revise", "否", true); link("revise", "draft"); link("publish", "end");
  } else if (id === "pipeline") { link("start", "input"); link("input", "process"); link("process", "report"); }
  else throw new TypeError("未知流程图模板");
  return instantiateFlowchart(readFlowchart({ ...createFlowchart(), nodes, edges }), prefix);
}
