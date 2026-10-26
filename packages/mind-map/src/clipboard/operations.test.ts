import { describe, expect, it } from "vitest";
import { readMindMapDocument } from "../model/document";
import type { MindMapNode } from "../model/types";
import { copyMindMapTopics, pasteMindMapTopics } from "./operations";
import { parseMindMapClipboard, serializeMindMapClipboard, textMindMapClipboard } from "./codec";

const source = readMindMapDocument({ version: 2, revision: 7, layout: "mind-map",
  root: { id: "r", text: "根", collapsed: false, children: [
    { id: "a", text: "计划", side: "left", collapsed: true, children: [
      { id: "b", text: "<中文>\n第二行", collapsed: false, children: [] },
    ] },
  ] }, floatingTopics: [{ root: { id: "f", text: "独立", collapsed: false, children: [] }, position: { x: 30, y: 60 }, side: "left" }] });

describe("portable topic clipboard", () => {
  it("copies topmost selected subtrees once, including collapsed descendants and free roots", () => {
    const fragment = copyMindMapTopics(source, ["b", "a", "f"]);
    expect(fragment.topics.map(topic => topic.id)).toEqual(["a", "f"]);
    expect(fragment.topics[0]).not.toHaveProperty("side");
    expect(fragment.topics[0]?.collapsed).toBe(true);
    expect(fragment.topics[0]?.children[0]?.text).toBe("<中文>\n第二行");
    expect(parseMindMapClipboard(serializeMindMapClipboard(fragment))).toEqual(fragment);
    expect(textMindMapClipboard(fragment)).toBe("计划\n\t<中文>\n\t第二行\n独立");
  });
  it("pastes with fresh identities, expands the target and retains host metadata", () => {
    let sequence = 0;
    const fragment = copyMindMapTopics(source, ["a"]);
    const result = pasteMindMapTopics(source, fragment, "a", () => `copy-${++sequence}`);
    expect(result.document.revision).toBe(7);
    expect(result.document.root.children[0]?.collapsed).toBe(false);
    expect(result.document.root.children[0]?.children[1]).toMatchObject({ id: "copy-1", collapsed: true,
      children: [{ id: "copy-2", text: "<中文>\n第二行" }] });
    expect(result.ids).toEqual(["copy-1"]);
    expect(source.root.children[0]?.children).toHaveLength(1);
  });
  it("pastes several independent roots at distinct root-relative positions", () => {
    let sequence = 0;
    const result = pasteMindMapTopics(source, copyMindMapTopics(source, ["a", "f"]), { x: 100, y: 200 }, () => `p${++sequence}`);
    expect(result.document.floatingTopics?.slice(1).map(topic => topic.position)).toEqual([{ x: 100, y: 200 }, { x: 100, y: 320 }]);
    expect(result.document.floatingTopics?.[1]?.root.collapsed).toBe(true);
  });
  it("rejects invalid destination, reused identity and untrusted fields atomically", () => {
    const fragment = copyMindMapTopics(source, ["a"]);
    expect(() => pasteMindMapTopics(source, fragment, "missing", () => "new")).toThrow();
    expect(() => pasteMindMapTopics(source, fragment, "r", () => "r")).toThrow();
    expect(() => parseMindMapClipboard(JSON.stringify({ ...fragment, plugin: true }))).toThrow();
    expect(() => parseMindMapClipboard(JSON.stringify({ ...fragment, version: 99 }))).toThrow();
    expect(() => parseMindMapClipboard(" ".repeat(4000001))).toThrow(/budget/);
    expect(source.root.children).toHaveLength(1);
  });
  it("enforces the destination depth budget including hidden pasted descendants", () => {
    let node: MindMapNode = { id: "deep64", text: "深", collapsed: false, children: [] };
    for (let depth = 63; depth >= 0; depth--) node = { id: `deep${depth}`, text: "深", collapsed: false, children: [node] };
    const deep = readMindMapDocument({ version: 1, revision: 0, layout: "mind-map", root: node });
    expect(() => pasteMindMapTopics(deep, copyMindMapTopics(source, ["f"]), "deep64", () => "new")).toThrow(/budget/);
  });
  it("bounds indentation expansion in the plain-text clipboard flavor", () => {
    let node: MindMapNode = { id: "deep63", text: "", collapsed: false, children: Array.from({ length: 8 }, (_, i) => ({
      id: `leaf${i}`, text: "\n".repeat(9000), collapsed: false, children: [],
    })) };
    for (let depth = 62; depth >= 0; depth--) node = { id: `deep${depth}`, text: "", collapsed: false, children: [node] };
    expect(() => textMindMapClipboard({ version: 1, topics: [node] })).toThrow(/outline budget/);
  });
});
