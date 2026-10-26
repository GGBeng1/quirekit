import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, addSequenceParticipant, addSequenceMessage, addSequenceFragment } from "@quirekit/flowchart";
import { localizeCreatedFlowContent } from "./content";

it("localizes only newly created structural defaults, never matching existing user content", () => {
  const before = { ...createFlowchart(), nodes: [createFlowchartNode("old", "lifeline", { x: 10, y: 20 }, "新参与者")] };
  const after = localizeCreatedFlowContent(before, addSequenceParticipant(before, "new", "old"), "en");
  expect(after.nodes[0]!.text).toBe("新参与者"); expect(after.nodes[1]!.text).toBe("New participant");
  const message = localizeCreatedFlowContent(after, addSequenceMessage(after, "message", ["old", "new"], "request"), "en");
  expect(message.edges[0]!.label).toBe("Request");
  const fragment = localizeCreatedFlowContent(message, addSequenceFragment(message, "alt", ["old", "new"], "alt"), "en");
  expect(fragment.nodes.filter(node => node.parent === "alt").map(node => node.text)).toEqual(["[condition]", "[else]"]);
  expect(fragment.nodes.find(node => node.id === "old")!.text).toBe("新参与者");
  expect(localizeCreatedFlowContent(before, after, "zh-CN")).toBe(after);
});
