import { expect, it } from "vitest";
import { createFlowchart } from "./create";
import { parseFlowchart, serializeFlowchart, readFlowchart } from "./document";

it("preserves both normal and degenerate label offsets and crossing choices strictly", () => {
  for (const labelOffset of [-32, 0, 48, { x: 12, y: -6 }]) {
    const source = { ...createFlowchart(), edges: [{ id: "e", source: { x: 0, y: 0 }, target: { x: 300, y: 0 }, vertices: [],
      routing: "straight" as const, connector: "sharp" as const, crossing: "jump" as const, label: "关系", labelPosition: 0.25, labelOffset, style: {} }] };
    expect(parseFlowchart(serializeFlowchart(source))).toEqual(source);
    expect(() => readFlowchart({ ...source, edges: [{ ...source.edges[0], crossing: "invalid" }] })).toThrow();
    expect(() => readFlowchart({ ...source, edges: [{ ...source.edges[0], labelOffset: Infinity }] })).toThrow();
    expect(() => readFlowchart({ ...source, edges: [{ ...source.edges[0], connector: "smooth" }] })).toThrow();
  }
});
