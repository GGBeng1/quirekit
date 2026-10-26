import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { addSequenceActivation, addSequenceMessage, addSequenceParticipant } from "./index";

it("appends messages, reverses returns and extends lifelines without shifting earlier events", () => {
  let graph = addSequenceParticipant(addSequenceParticipant(createFlowchart(), "a"), "b");
  graph = addSequenceActivation(graph, "active", "b");
  graph = addSequenceMessage(graph, "request", ["a", "b"], false);
  expect(graph.edges[0]!.target).toMatchObject({ node: "active", anchor: { x: 0, y: 0 } });
  const original = graph;
  for (let i = 0; i < 20; i++) graph = addSequenceMessage(graph, `reply-${i}`, ["a", "b"], true);
  expect(graph.nodes.find(node => node.id === "a")!.height).toBeGreaterThan(original.nodes[0]!.height);
  const first = graph.edges[0]!.source, before = original.edges[0]!.source;
  if (!("node" in first) || !("node" in before)) throw new Error("missing anchors");
  expect(first.anchor!.y * graph.nodes[0]!.height).toBeCloseTo(before.anchor!.y * original.nodes[0]!.height);
  expect(graph.edges.at(-1)).toMatchObject({ source: { node: "b" }, target: { node: "a" }, style: { dashed: true, targetArrow: "open" } });
});
it("requires explicit valid participants before changing source", () => {
  const source = addSequenceParticipant(createFlowchart(), "a");
  expect(() => addSequenceActivation(source, "activation", "missing")).toThrow();
  expect(() => addSequenceMessage(source, "message", ["a"], false)).toThrow();
  expect(source.nodes).toHaveLength(1); expect(source.edges).toHaveLength(0);
  const container = createFlowchartNode("cycle", "container", { x: 0, y: 0 }, "Invalid owner");
  expect(() => addSequenceParticipant({ ...source, nodes: [{ ...container, parent: container.id }] }, "b")).toThrow(/cyclic/);
});
it("expands nested sequence containers when participants or events exceed their bounds", () => {
  const outer = createFlowchartNode("outer", "container", { x: 0, y: 0 }, "时序图");
  const frame = { ...createFlowchartNode("frame", "container", { x: 30, y: 70 }, "登录"), parent: "outer" };
  const actor = { ...createFlowchartNode("a", "lifeline", { x: 80, y: 130 }, "用户"), parent: "frame" };
  let graph = readFlowchart({ ...createFlowchart(), nodes: [outer, frame, actor] });
  for (let i = 0; i < 4; i++) graph = addSequenceParticipant(graph, `actor-${i}`, "a");
  for (let i = 0; i < 15; i++) graph = addSequenceMessage(graph, `event-${i}`, ["a", "actor-0"], false);
  const updated = new Map(graph.nodes.map(node => [node.id, node]));
  for (const member of graph.nodes.filter(node => node.parent)) {
    const owner = updated.get(member.parent!)!;
    expect(owner.x + owner.width).toBeGreaterThan(member.x + member.width);
    expect(owner.y + owner.height).toBeGreaterThan(member.y + member.height);
  }
  expect(updated.get("a")?.x).toBe(actor.x); expect(updated.get("a")?.y).toBe(actor.y);
  const other = { ...outer, id: "other", x: 5000, width: 100, height: 100 };
  const overflow = { ...createFlowchartNode("overflow", "process", { x: 5100, y: 100 }, "手动缩小后的容器成员"), parent: other.id };
  const mixed = readFlowchart({ ...graph, nodes: [...graph.nodes, other, overflow] });
  const next = addSequenceParticipant(mixed, "extra", "a");
  expect(next.nodes.find(node => node.id === other.id)).toEqual(other);
});
