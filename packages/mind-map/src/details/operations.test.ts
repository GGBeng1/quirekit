import { expect, it } from "vitest";
import { createMindMapDocument, copyMindMapTopics, pasteMindMapTopics, formatMindMapTopics, moveMindMapTopic,
  readMindMapDocument, serializeMindMap, parseMindMap } from "../index";
import { setMindMapTopicDetails } from "./operations";
const source = createMindMapDocument({ text: "root", children: [{ text: "topic", children: [] }] });
const id = source.root.children[0]!.id;
const image = { dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", width: 100, height: 80, alt: "说明" };
const details = { link: "https://example.com/计划", note: "中文\n<script>纯文本</script>", marker: "priority-1" as const, image };

it("retains all detail fields through source, shape, move and fresh-identity clipboard changes", () => {
  const next = setMindMapTopicDetails(source, [id], details);
  expect(next.version).toBe(5); expect(next.root.children[0]!.details).toEqual(details);
  expect(parseMindMap(serializeMindMap(next))).toEqual(next);
  expect(formatMindMapTopics(next, [id], { bold: true }).version).toBe(5);
  expect(moveMindMapTopic(next, id, { x: 100, y: 200 }).floatingTopics![0]!.root.details).toEqual(details);
  const fragment = copyMindMapTopics(next, [id]); expect(fragment.version).toBe(4);
  expect(pasteMindMapTopics(source, fragment, source.root.id, () => "fresh").document.root.children[1]!.details).toEqual(details);
});
it("clears only explicit fields, rejects deleted targets and leaves no-op history untouched", () => {
  const next = setMindMapTopicDetails(source, [id], details);
  expect(setMindMapTopicDetails(next, [id], details)).toBe(next);
  expect(setMindMapTopicDetails(next, [id], { image: null }).root.children[0]!.details?.note).toBe(details.note);
  expect(setMindMapTopicDetails(next, [id], null).root.children[0]!.details).toBeUndefined();
  expect(() => setMindMapTopicDetails(next, [id, "missing"], { marker: "priority-2" })).toThrow(/no longer exists/u);
});
it.each(["javascript:alert(1)", "data:text/html,hi", "https://user:password@example.com", "ftp://example.com", "https://exa mple.com", "//example.com", "https:example.com", "https:\\example.com"])("rejects unsafe or ambiguous destination %s", link => {
  expect(() => setMindMapTopicDetails(source, [id], { link })).toThrow();
});

it("bounds both intrinsic PNG pixels and aggregate decoded pixels before mounting", () => {
  // Header-only budget fixtures intentionally stop before browser decoding.
  const large = { ...image, dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAD6AAAAfQCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=" };
  const forest = createMindMapDocument({ text: "root", children: Array.from({ length: 3 }, (_, i) => ({ text: `image ${i}`, children: [] })) });
  expect(() => setMindMapTopicDetails(forest, forest.root.children.map(node => node.id), { image: large })).toThrow(/budget/u);
  expect(() => setMindMapTopicDetails(source, [id], { image: { ...large, dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAD6AAABAACAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=" } })).toThrow(/pixel budget/u);
});
it("rejects remote/non-PNG images, unbounded pixels, unsupported fields and old versions", () => {
  for (const value of [{ ...image, dataUrl: "https://example.com/a.png" }, { ...image, width: 513 }, { ...image, dataUrl: "data:image/png;base64,YmFk" }]) {
    expect(() => setMindMapTopicDetails(source, [id], { image: value })).toThrow();
  }
  expect(() => setMindMapTopicDetails(source, [id], { note: "x".repeat(10001) })).toThrow();
  expect(() => setMindMapTopicDetails(source, [id], { html: "x" } as never)).toThrow();
  expect(() => readMindMapDocument({ ...source, root: { ...source.root, details } })).toThrow();
});
