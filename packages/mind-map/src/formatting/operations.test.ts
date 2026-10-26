import { expect, it } from "vitest";
import { readMindMapDocument, serializeMindMap, parseMindMap } from "../model/document";
import { formatMindMapTopics } from "./operations";
import { copyMindMapTopics, pasteMindMapTopics } from "../clipboard/operations";
import { moveMindMapTopic, addMindMapFloatingTopic } from "../model/forest";
import { editMindMapStructure } from "../structure/operations";

const source = readMindMapDocument({ version: 1, revision: 7, layout: "mind-map", root: {
  id: "r", text: "root", collapsed: false, children: [{ id: "a", text: "topic", collapsed: false, children: [] }],
} });

it("upgrades explicit formatting atomically and preserves it through JSON, structure, drag and clipboard", () => {
  const style = { fontSize: 24, bold: true, color: "#112233", fill: "#ffffff", borderColor: "#4855ec", borderWidth: 2,
    shape: "ellipse" as const, lineColor: "#abcdef", lineWidth: 3, linePattern: "dashed" as const, lineStyle: "elbow" as const };
  const next = formatMindMapTopics(source, ["r", "a", "a"], style);
  expect(next.version).toBe(3); expect(next.revision).toBe(7); expect(next.root.style).toEqual(style);
  expect(next.root.children[0]!.style).toEqual(style);
  expect(parseMindMap(serializeMindMap(next))).toEqual(next);
  const wrapped = editMindMapStructure(next, ["a"], "add-parent", () => "p").document;
  expect(wrapped.root.children[0]!.children[0]!.style).toEqual(style);
  const free = moveMindMapTopic(next, "a", { x: 10, y: 100 });
  expect(free.version).toBe(3); expect(free.floatingTopics![0]!.root.style).toEqual(style);
  expect(addMindMapFloatingTopic(free, "f", { x: 30, y: 60 }).version).toBe(3);
  const clipboard = copyMindMapTopics(free, ["a"]);
  expect(clipboard.version).toBe(2);
  expect(pasteMindMapTopics(source, clipboard, "r", () => "pasted").document.root.children[1]!.style).toEqual(style);
});

it("changes only selected topics and clears explicit fields without persisting a mixed or default value", () => {
  const next = formatMindMapTopics(source, ["a"], { color: "#AABBCC", bold: true });
  expect(next.root.style).toBeUndefined(); expect(next.root.children[0]!.style).toEqual({ color: "#aabbcc", bold: true });
  const cleared = formatMindMapTopics(next, ["a"], { color: null });
  expect(cleared.root.children[0]!.style).toEqual({ bold: true });
  expect(formatMindMapTopics(cleared, ["a"], { bold: null }).root.children[0]!.style).toBeUndefined();
  expect(formatMindMapTopics(source, ["missing"], { bold: true })).toBe(source);
  expect(formatMindMapTopics(source, ["a"], { bold: null })).toBe(source);
  expect(formatMindMapTopics(next, ["a"], { color: "#aabbcc" })).toBe(next);
});

it.each([{ fontSize: 100 }, { fontSize: 14.5 }, { bold: "mixed" }, { color: "url(x)" }, { borderWidth: -1 },
  { shape: "unknown" }, { lineStyle: "straight" }, { lineWidth: 0 }, { padding: 20 }])("rejects invalid fields before any write", patch => {
  expect(() => formatMindMapTopics(source, ["r"], patch as never)).toThrow();
  expect(source.version).toBe(1);
});

it("never accepts format fields under an older document version", () => {
  expect(() => readMindMapDocument({ ...source, root: { ...source.root, style: { bold: true } } })).toThrow();
  expect(() => readMindMapDocument({ ...source, version: 3, floatingTopics: [], root: { ...source.root, style: { fontFamily: "x" } } })).toThrow();
});
