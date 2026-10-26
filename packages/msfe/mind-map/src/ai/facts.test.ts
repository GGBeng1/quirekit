import { describe, expect, it } from "vitest";
import { createMindMapEmbed } from "@quirekit/mind-map";
import { mindMapMarkdown } from "../source";
import { msfeMindMapAiCapabilities } from "./facts";

describe("mind map AI facts", () => {
  it("summarizes a mind map fence as an outline", () => {
    const fact = msfeMindMapAiCapabilities[0]!;
    if (fact.kind !== "source-block") throw new Error("unexpected fact");
    const label = fact.present!({ text: mindMapMarkdown(createMindMapEmbed("mind")), name: "FencedCode", attrs: { language: "quirekit-mind-map" } })?.label;
    expect(label).toMatch(/^思维导图 \{"id":"mind","revision":\d+/u);
  });
});
