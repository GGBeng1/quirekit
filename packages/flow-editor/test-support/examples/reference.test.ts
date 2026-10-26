import { describe, expect, it } from "vitest";
import { readFlowchartPlaybackTrace, serializeFlowchart } from "@quirekit/flowchart";
import { createFlowchartPlaybackExample } from "./reference";

describe("illustrative algorithm diagram", () => {
  it("addresses real canonical objects and distinguishes reuse from invalidation", () => {
    const sample = createFlowchartPlaybackExample("zh-CN", "run"), ids = new Set([...sample.document.nodes, ...sample.document.edges].map(item => item.id));
    expect(readFlowchartPlaybackTrace(sample.trace, id => ids.has(id))).toEqual(sample.trace);
    expect(sample.trace.steps[0]!.description).toContain("不是解析器的实测轨迹");
    const branch = sample.trace.steps.find(step => step.id === "invalidate")!;
    expect(branch.changes).toContainEqual({ id: "run-affected", state: "invalid" });
    expect(branch.changes).toContainEqual({ id: "run-reused", state: "reused" });
    expect(serializeFlowchart(sample.document)).not.toContain('"changes"');
  });
  it("localizes new content without changing graph identities or trace ownership", () => {
    const zh = createFlowchartPlaybackExample("zh-CN"), en = createFlowchartPlaybackExample("en");
    expect(en.document.nodes.map(item => item.id)).toEqual(zh.document.nodes.map(item => item.id));
    expect(en.document.nodes[0]!.text).toBe("Receive new chunk");
    expect(en.trace.title).toBe("Late reference resolution");
    expect(en.trace.steps[0]!.description).toContain("not a measured parser trace");
  });
});
