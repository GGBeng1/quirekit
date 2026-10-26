import { describe, expect, it } from "vitest";
import { parseMindMap, readMindMapDocument, serializeMindMap } from "./document";

const source = {
  version: 1, revision: 3, layout: "mind-map",
  root: { id: "root", text: "时间管理\n<&>", collapsed: false, children: [
    { id: "week", text: "本周", collapsed: true, side: "left", children: [
      { id: "monday", text: "周一", collapsed: false, children: [] },
    ] },
  ] },
};

describe("canonical mind map document", () => {
  it("round-trips ordered, collapsed trees with Chinese and literal markup", () => {
    const document = readMindMapDocument(source);
    expect(parseMindMap(serializeMindMap(document))).toEqual(source);
    expect(Object.isFrozen(document.root.children[0]?.children)).toBe(true);
    expect(document.root).not.toBe(source.root);
  });

  it.each([
    { ...source, version: 2 }, { ...source, layout: "unknown" }, { ...source, revision: NaN },
    { ...source, theme: {} }, { ...source, root: { ...source.root, image: "remote" } },
    { ...source, root: { ...source.root, side: "left" } },
    { ...source, root: { ...source.root, collapsed: true } },
    { ...source, root: { ...source.root, text: "\u0000" } },
    { ...source, root: { ...source.root, text: "\ud800" } },
    { ...source, root: { ...source.root, children: [source.root.children[0], source.root.children[0]] } },
    { ...source, root: { ...source.root, children: [{ ...source.root.children[0], id: "root" }] } },
    { ...source, root: { ...source.root, children: new Array(1) } },
  ])("rejects unsupported or unsafe input without dropping fields", (input) => {
    expect(() => readMindMapDocument(input)).toThrow();
  });

  it("rejects trees exceeding cumulative node or text budgets", () => {
    const children = Array.from({ length: 10000 }, (_, index) => ({ id: `n${index}`, text: "", collapsed: false, children: [] }));
    expect(() => readMindMapDocument({ ...source, root: { ...source.root, children } })).toThrow(/budget/);
    const longChildren = children.slice(0, 101).map(node => ({ ...node, text: "x".repeat(10000) }));
    expect(() => readMindMapDocument({ ...source, root: { ...source.root, children: longChildren } })).toThrow(/budget/);
  });

  it("bounds depth, text, JSON and cyclic inputs before renderer access", () => {
    const root = { ...source.root, children: [] as unknown[] };
    root.children.push(root);
    expect(() => readMindMapDocument({ ...source, root })).toThrow();
    expect(() => readMindMapDocument({ ...source, root: { ...source.root, text: "x".repeat(10001) } })).toThrow();
    expect(() => parseMindMap(" ".repeat(4000001))).toThrow();
    let deep: unknown = { id: "end", text: "", collapsed: false, children: [] };
    for (let i = 0; i < 66; i++) deep = { id: `n${i}`, text: "", collapsed: false, children: [deep] };
    expect(() => readMindMapDocument({ ...source, root: deep })).toThrow();
  });
});
