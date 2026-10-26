import { expect, it } from "vitest";
import { readFlowchartPlaybackTrace } from "@quirekit/flowchart";
import { createFlowchartResidualExample } from "./example";

it("retains complete fixed content and two canonical rounded bypasses with independent beams and junction halos", () => {
  const { document, trace } = createFlowchartResidualExample("zh-CN", "test"), nodes = new Set(document.nodes.map(node => node.id)), edges = new Set(document.edges.map(edge => edge.id));
  expect(readFlowchartPlaybackTrace(trace, (id, kind) => kind ? edges.has(id) : nodes.has(id) || edges.has(id))).toEqual(trace);
  expect(trace.hidden ?? []).toEqual([]);
  for (const n of [1, 2]) {
    expect(document.edges.find(edge => edge.id === `test-skip-${n}`)).toMatchObject({ connector: "rounded", source: { node: `test-split-${n}` }, target: { node: `test-add-${n}` } });
    expect(trace.steps.some(step => step.effects?.some(cue => cue.id === `test-skip-${n}` && cue.kind === "travel" && cue.payload === "beam"))).toBe(true);
  }
  expect(trace.steps[1]!.effects!.some(cue => cue.kind === "pulse" && cue.halo)).toBe(true);
  expect(trace.steps[0]!.changes.every(change => change.state === "pending")).toBe(true);
  expect(createFlowchartResidualExample("en", "test").trace.title).toBe("Residual connection animation");
});
