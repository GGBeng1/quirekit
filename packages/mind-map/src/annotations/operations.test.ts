import { expect, it } from "vitest";
import { createMindMapDocument, readMindMapDocument, parseMindMap, serializeMindMap, moveMindMapTopic, removeMindMapTopics,
  copyMindMapTopics, pasteMindMapTopics, formatMindMapTopics } from "../index";
import { putMindMapAnnotation, removeMindMapAnnotation } from "./operations";
const base = createMindMapDocument({ text: "root", children: [{ text: "a", children: [] }, { text: "b", children: [] }] });
const [a, b] = base.root.children.map(node => node.id) as [string, string];
const relation = { id: "rel", kind: "relation" as const, text: "依赖", from: a, to: b };
const group = { id: "group", kind: "summary" as const, text: "阶段一", topicIds: [a, b], color: "#4855ec" };

it("keeps annotation identities through structure, formatting and source round trips", () => {
  const source = putMindMapAnnotation(putMindMapAnnotation(base, relation), group);
  expect(source.version).toBe(4); expect(source.revision).toBe(base.revision);
  expect(parseMindMap(serializeMindMap(source))).toEqual(source);
  const moved = moveMindMapTopic(source, a, { x: -200, y: 100 });
  expect(moved.annotations).toEqual(source.annotations);
  expect(formatMindMapTopics(moved, [a], { bold: true }).annotations).toEqual(source.annotations);
  expect(putMindMapAnnotation(source, group)).toBe(source);
  expect(removeMindMapAnnotation(source, "missing")).toBe(source);
});

it("prunes deleted endpoints and members but retains surviving groups", () => {
  const source = putMindMapAnnotation(putMindMapAnnotation(base, relation), group);
  const next = removeMindMapTopics(source, [a]);
  expect(next.annotations).toEqual([{ ...group, topicIds: [b] }]);
  expect(removeMindMapTopics(next, [b]).annotations).toEqual([]);
  expect(removeMindMapAnnotation(source, "rel").annotations).toEqual([group]);
});

it("copies complete internal objects and remaps all references and identities on paste", () => {
  const source = putMindMapAnnotation(putMindMapAnnotation(base, relation), group);
  expect(copyMindMapTopics(source, [a]).annotations).toEqual([]);
  const clipboard = copyMindMapTopics(source, [a, b]); let index = 0;
  expect(clipboard.version).toBe(3);
  const pasted = pasteMindMapTopics(base, clipboard, base.root.id, () => `new-${index++}`);
  expect(pasted.document.version).toBe(4);
  expect(pasted.document.annotations).toEqual([{ ...relation, id: "new-2", from: "new-0", to: "new-1" },
    { ...group, id: "new-3", topicIds: ["new-0", "new-1"] }]);
});

it.each([{ ...relation, to: "missing" }, { ...relation, to: a }, { ...group, topicIds: [a, a] },
  { ...group, text: "x".repeat(161) }, { ...group, color: "red" }, { ...relation, topicIds: [a] }])("rejects malformed objects atomically", annotation => {
  expect(() => putMindMapAnnotation(base, annotation as never)).toThrow();
  expect(base.annotations).toBeUndefined();
});

it("rejects old carriers, duplicate identities and annotations without a bounded list", () => {
  expect(() => readMindMapDocument({ ...base, annotations: [] })).toThrow();
  const source = putMindMapAnnotation(base, relation);
  expect(() => readMindMapDocument({ ...source, annotations: [relation, relation] })).toThrow();
  expect(() => readMindMapDocument({ ...source, annotations: Array.from({ length: 501 }, (_, i) => ({ ...relation, id: `a${i}` })) })).toThrow();
});
