import { describe, expect, it } from "vitest";
import { createFlowchartEmbed } from "@quirekit/flowchart";
import { flowchartMarkdown } from "../source";
import { msfeFlowchartAiCapabilities } from "./facts";

describe("flowchart AI facts", () => {
  it("summarizes a flowchart fence and leaves other code alone", () => {
    const fact = msfeFlowchartAiCapabilities[0]!;
    if (fact.kind !== "source-block") throw new Error("unexpected fact");
    const text = flowchartMarkdown(createFlowchartEmbed("flow"));
    expect(fact.present!({ text, name: "FencedCode", attrs: { language: "quirekit-flowchart" } })?.label).toMatch(/^流程图 \{"id":"flow","revision":\d+/u);
    expect(fact.present!({ text: "```ts\nx\n```", name: "FencedCode", attrs: { language: "ts" } })).toBeUndefined();
  });
});
