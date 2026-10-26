import { expect, it } from "vitest";
import { createMindMapDocument } from "../outline/create";
import { applyMindMapContent } from "./operations";

const source = createMindMapDocument({ text: "root", children: [{ text: "child", children: [] }] });
const child = source.root.children[0]!.id;

it("applies captured fields and annotations together without changing identity or revision", () => {
  const next = applyMindMapContent(source, { details: [{ ids: [source.root.id], patch: { note: "root note" } },
    { ids: [child], patch: { link: "https://example.com", marker: "priority-2" } }],
    annotations: [{ id: "relation", kind: "relation", from: source.root.id, to: child, text: "caption" }] });
  expect(next.root.details?.note).toBe("root note");
  expect(next.root.children[0]!.details).toEqual({ link: "https://example.com", marker: "priority-2" });
  expect(next.annotations?.[0]?.text).toBe("caption");
  expect(next.revision).toBe(source.revision);
  expect(source.root.details).toBeUndefined();
  expect(applyMindMapContent(next, { details: [{ ids: [child], patch: { marker: "priority-2" } }] })).toBe(next);
});

it("rejects the whole batch for invalid fields or missing topics", () => {
  expect(() => applyMindMapContent(source, { details: [{ ids: [child], patch: { note: "valid" } },
    { ids: [source.root.id], patch: { link: "javascript:bad" } }] })).toThrow();
  expect(() => applyMindMapContent(source, { details: [{ ids: ["missing"], patch: { note: "x" } }] })).toThrow(/no longer exists/u);
  expect(() => applyMindMapContent(source, { annotations: [{ id: "a", kind: "relation", from: child, to: "missing", text: "bad" }] })).toThrow();
  expect(source.root.children[0]!.details).toBeUndefined();
});
