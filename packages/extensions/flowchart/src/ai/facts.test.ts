import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartEmbed, createFlowchartNode, readFlowchartEmbed } from "@quirekit/flowchart";
import { flowchartAiItems, flowchartAiLabel } from "./facts";

describe("flowchart AI facts", () => {
  it("lists node text, class members and connections from the graph source", () => {
    const base = createFlowchartEmbed("flow-1", "审批流程");
    const owner = { ...createFlowchartNode("cls", "uml-class", { x: 0, y: 200 }, "Order"), uml: { attributes: ["+id: string"], operations: ["+submit()"] } };
    const flow = readFlowchartEmbed({ ...base, document: { ...createFlowchart(), nodes: [
      createFlowchartNode("a", "process", { x: 0, y: 0 }, "申请"), createFlowchartNode("b", "decision", { x: 200, y: 0 }, "审核"), owner
    ], edges: [{ id: "ab", source: { node: "a" }, target: { node: "b" }, vertices: [], label: "提交", labelPosition: 0.5, routing: "orthogonal", style: {} }] } });

    const items = flowchartAiItems(flow);
    expect(items.map(item => item.id)).toEqual(["a", "b", "cls", "ab"]);
    expect(items[2]).toMatchObject({ label: "Order\n+id: string\n+submit()", properties: { kind: "node", shape: "uml-class" } });
    expect(items[3]).toEqual({ id: "ab", label: "提交", properties: { kind: "edge", from: "a", to: "b" } });
    expect(flowchartAiLabel(flow)).toMatch(/^流程图 \{"id":"flow-1","revision":0,"title":"审批流程","total":4,/u);
  });
});
