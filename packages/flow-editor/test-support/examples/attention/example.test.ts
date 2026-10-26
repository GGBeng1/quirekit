import { describe, expect, it } from "vitest";
import { readFlowchartPlaybackTrace, serializeFlowchart } from "@quirekit/flowchart";
import { createFlowchartAttentionExample } from "./example";

describe("attention teaching animation", () => {
  it("introduces connectors only after their initially hidden endpoint content has appeared", () => {
    const { document, trace } = createFlowchartAttentionExample("zh-CN", "test"), times = new Map<string, number>(); let elapsed = 0;
    for (const step of trace.steps) {
      for (const cue of step.effects ?? []) if (cue.kind === "appear") times.set(cue.id, elapsed + (cue.delay ?? 0) + (cue.duration ?? step.duration ?? 1200));
      elapsed += step.duration ?? 1200;
    }
    expect(document.edges.every(edge => trace.hidden?.includes(edge.id))).toBe(true);
    for (const edge of document.edges) {
      const shown = times.get(edge.id)!; expect(shown).toBeGreaterThan(0);
      for (const end of [edge.source, edge.target]) if ("node" in end && trace.hidden!.includes(end.node)) expect(shown - 350).toBeGreaterThanOrEqual(times.get(end.node)!);
    }
    expect(document.edges.find(edge => edge.id === "test-score-output")!.source).toMatchObject({ node: "test-weight-2-2" });
  });
  it("addresses real paths and independently reveals the causal matrix, without claiming model telemetry", () => {
    const example = createFlowchartAttentionExample("zh-CN", "test"), nodes = new Set(example.document.nodes.map(item => item.id)), edges = new Set(example.document.edges.map(item => item.id));
    expect(readFlowchartPlaybackTrace(example.trace, (id, kind) => kind ? edges.has(id) : nodes.has(id) || edges.has(id))).toEqual(example.trace);
    const qkv = example.trace.steps.find(step => step.id === "qkv")!;
    expect(qkv.effects!.filter(effect => effect.kind === "travel")).toHaveLength(9);
    expect(qkv.effects!.filter(effect => effect.kind === "travel").every(effect => (effect.delay ?? 0) < 2300)).toBe(true);
    expect(example.trace.hidden).not.toContain("test-out-title");
    const matrix = example.document.nodes.filter(node => node.id.includes("-weight-")); expect(matrix).toHaveLength(9);
    expect(matrix.filter(node => node.text === "—")).toHaveLength(3);
    expect(example.trace.steps[0]!.description).toContain("不是模型实测");
    expect(serializeFlowchart(example.document)).not.toContain('"effects"');
  });
  it("localizes content while keeping all motion identities and schema stable", () => {
    const zh = createFlowchartAttentionExample("zh-CN"), en = createFlowchartAttentionExample("en");
    expect(en.document.nodes.map(node => node.id)).toEqual(zh.document.nodes.map(node => node.id));
    expect(en.trace.title).toBe("Self-attention animation"); expect(en.trace.steps[1]!.title).toBe("Project Q, K and V in parallel");
    expect(en.document.nodes.find(node => node.id.endsWith("-formula"))!.text).toBe("softmax(QKᵀ / √d)");
  });
});
