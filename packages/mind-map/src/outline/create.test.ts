import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { createMindMapDocument } from "./create";
import { mindMapOutlineSchema } from "./schema";
import { parseMindMap, serializeMindMap } from "../model/document";

const outline = { text: "项目 <计划> 🧠", children: [
  { text: "产品设计\n用户调研", children: [{ text: "访谈", children: [] }] },
  { text: "研发", children: [] },
] };

describe("model-neutral outline creation", () => {
  it("accepts the public JSON schema and creates an immutable editable document without DOM", () => {
    const validate = new Ajv2020().compile(mindMapOutlineSchema);
    expect(validate(outline)).toBe(true);
    const document = createMindMapDocument(outline, { layout: "logical-left" });
    expect(document).toMatchObject({ version: 2, revision: 0, layout: "logical-left", floatingTopics: [] });
    expect(document.root.children[0]?.children[0]?.text).toBe("访谈");
    expect(new Set([document.root.id, ...document.root.children.map(n => n.id), document.root.children[0]!.children[0]!.id]).size).toBe(4);
    expect(parseMindMap(serializeMindMap(document))).toEqual(document);
    expect(Object.isFrozen(document.root.children)).toBe(true);
    expect(Object.isFrozen(mindMapOutlineSchema.properties)).toBe(true);
    outline.children[1]!.text = "研发变更";
    expect(document.root.children[1]?.text).toBe("研发");
  });

  it.each([{}, { text: "主题" }, { text: 2, children: [] }, { text: "\u0000", children: [] }, { text: "\ud800", children: [] }, { text: "主题", children: [], id: "invented" },
    { text: "主题", children: [{ text: "子主题", children: [], color: "red" }] }])("rejects malformed structured output in schema and runtime", input => {
    expect(new Ajv2020().compile(mindMapOutlineSchema)(input)).toBe(false);
    expect(() => createMindMapDocument(input)).toThrow();
  });

  it("guards cycles, aliases, sparse arrays, accessors, depth and cumulative budgets", () => {
    const node = { text: "主题", children: [] as unknown[] };
    node.children.push(node);
    expect(() => createMindMapDocument(node)).toThrow();
    const leaf = { text: "子主题", children: [] };
    expect(() => createMindMapDocument({ text: "根", children: [leaf, leaf] })).toThrow();
    expect(() => createMindMapDocument({ text: "根", children: new Array(1) })).toThrow();
    expect(() => createMindMapDocument({ get text() { throw new Error("getter executed"); }, children: [] })).toThrow(/unsupported field/);
    expect(() => createMindMapDocument({ text: "根", children: Array.from({ length: 10000 }, () => ({ text: "", children: [] })) })).toThrow(/budget/);
    expect(() => createMindMapDocument({ text: "根", children: Array.from({ length: 101 }, () => ({ text: "a".repeat(10000), children: [] })) })).toThrow(/budget/);
    let deep: unknown = leaf;
    for (let i = 0; i < 66; i++) deep = { text: "层", children: [deep] };
    expect(() => createMindMapDocument(deep)).toThrow(/budget/);
    expect(() => createMindMapDocument(leaf, { layout: "unknown" as never })).toThrow();
  });
});
