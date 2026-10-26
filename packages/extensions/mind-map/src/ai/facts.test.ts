import { describe, expect, it } from "vitest";
import { createMindMapDocument, createMindMapEmbed, readMindMapEmbed } from "@quirekit/mind-map";
import { mindMapAiItems, mindMapAiLabel } from "./facts";

describe("mind map AI facts", () => {
  it("lists topics depth-first with their parents", () => {
    const base = createMindMapEmbed("mind-1", "项目推进");
    const mind = readMindMapEmbed({ ...base, document: createMindMapDocument({ text: "项目推进", children: [
      { text: "明确目标", children: [{ text: "收集需求", children: [] }] }, { text: "复盘", children: [] }
    ] }) });

    const items = mindMapAiItems(mind);
    expect(items.map(item => item.label)).toEqual(["项目推进", "明确目标", "收集需求", "复盘"]);
    expect(items[0]!.properties).toMatchObject({ kind: "root", parent: null, depth: 0 });
    expect(items[2]!.properties).toMatchObject({ kind: "topic", parent: items[1]!.id, depth: 2 });
    expect(mindMapAiLabel(mind)).toMatch(/^思维导图 \{"id":"mind-1",.*"total":4,/u);
  });
});
