import { expect, it } from "vitest";
import { createFlowchart } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { addSequenceParticipant, addSequenceMessage, addSequenceDestruction, addSequenceFragment } from "./index";

it("keeps actor messages horizontal, creates an open async arrow and a self call with two event heights", () => {
  let source = addSequenceParticipant(createFlowchart(), "user", undefined, true);
  source = addSequenceParticipant(source, "service", "user");
  source = addSequenceMessage(source, "async", ["user", "service"], "async");
  expect(source.nodes[0]?.shape).toBe("actor-lifeline");
  expect(source.edges[0]?.style).toMatchObject({ dashed: false, targetArrow: "open" });
  source = addSequenceMessage(source, "self", ["service"], "self");
  const call = source.edges[1]!;
  expect(call.vertices).toHaveLength(2);
  expect(call.source).toMatchObject({ node: "service" }); expect(call.target).toMatchObject({ node: "service" });
  if (!("node" in call.source) || !("node" in call.target)) throw new Error("Expected node anchors");
  expect(call.target.anchor!.y).toBeGreaterThan(call.source.anchor!.y);
  expect(call.vertices[1]!.y - call.vertices[0]!.y).toBe(36);
  expect(readFlowchart(JSON.parse(JSON.stringify(source)))).toEqual(source);
});
it("owns destruction markers and rejects duplicate destruction and later messages atomically", () => {
  let source = addSequenceParticipant(addSequenceParticipant(createFlowchart(), "a"), "b");
  source = addSequenceMessage(source, "message", ["a", "b"], false);
  source = addSequenceDestruction(source, "end", "b");
  const end = source.nodes.at(-1)!, participant = source.nodes.find(node => node.id === "b")!;
  expect(end).toMatchObject({ shape: "destruction", parent: "b" });
  expect(end.y + end.height / 2).toBe(participant.y + participant.height);
  expect(() => addSequenceMessage(source, "late", ["a", "b"], false)).toThrow(/销毁/);
  expect(() => addSequenceDestruction(source, "again", "b")).toThrow(/销毁/);
  expect(source.edges).toHaveLength(1);
});
it("creates editable alt guards without adopting the crossing lifelines or their messages", () => {
  let source = addSequenceParticipant(addSequenceParticipant(createFlowchart(), "a"), "b");
  source = addSequenceMessage(source, "message", ["a", "b"], false);
  const next = addSequenceFragment(source, "frame", ["a", "b"], "alt");
  expect(next.nodes.filter(node => node.parent === "frame").map(node => node.text)).toEqual(["[条件成立]", "[否则]"]);
  expect(next.nodes.find(node => node.id === "frame")?.shape).toBe("sequence-alt");
  expect(next.nodes.slice(0, 2)).toEqual(source.nodes); expect(next.edges).toEqual(source.edges);
  expect(readFlowchart(next)).toEqual(next);
});
