import { expect, it } from "vitest";
import { parseMindMap, readMindMapDocument, serializeMindMap } from "./document";
import { addMindMapFloatingTopic, moveMindMapTopic, removeMindMapTopics } from "./forest";

const source = readMindMapDocument({ version: 1, revision: 4, layout: "mind-map", root: {
  id: "root", text: "中心", collapsed: false, children: [{ id: "week", text: "本周", side: "left", collapsed: true,
    children: [{ id: "mon", text: "周一", collapsed: false, children: [] }] }],
} });

it("detaches, saves and reattaches an entire collapsed subtree without changing revision", () => {
  const detached = moveMindMapTopic(source, "week", { x: 0, y: -300 }, "left");
  expect(detached.root.children).toHaveLength(0);
  expect(detached.floatingTopics?.[0]).toMatchObject({ side: "left", position: { x: 0, y: -300 },
    root: { id: "week", collapsed: true, children: [{ id: "mon" }] } });
  expect(parseMindMap(serializeMindMap(detached))).toEqual(detached);
  const attached = moveMindMapTopic(detached, "week", "root");
  expect(attached.root.children[0]?.children[0]?.id).toBe("mon");
  expect(attached.floatingTopics).toEqual([]);
  expect(attached.revision).toBe(4);
  expect(() => moveMindMapTopic(detached, "week", "mon")).toThrow();
});

it("keeps the main root and removes overlapping selections once across trees", () => {
  const next = addMindMapFloatingTopic(source, "free", { x: -100, y: 0 });
  const result = removeMindMapTopics(next, ["root", "week", "mon", "free"]);
  expect(result.root).toMatchObject({ id: "root", children: [] });
  expect(result.floatingTopics).toEqual([]);
});

it("validates positions and identities across the forest", () => {
  expect(() => addMindMapFloatingTopic(source, "mon", { x: 0, y: 0 })).toThrow();
  for (const x of [NaN, Infinity, 10000001]) expect(() => addMindMapFloatingTopic(source, "free", { x, y: 0 })).toThrow();
  expect(() => readMindMapDocument({ ...source, floatingTopics: [] })).toThrow();
  expect(() => readMindMapDocument({ ...source, version: 2 })).toThrow();
});

it("keeps the existing left/right branches on their sides after a root child is detached", () => {
  const document = readMindMapDocument({ ...source, root: { ...source.root, children: [0, 1, 2, 3].map(index => ({
    id: `b${index}`, text: "分支", collapsed: false, children: [],
  })) } });
  const next = moveMindMapTopic(document, "b0", { x: 200, y: 300 });
  expect(next.root.children.map(node => node.side)).toEqual(["left", "right", "left"]);
});
