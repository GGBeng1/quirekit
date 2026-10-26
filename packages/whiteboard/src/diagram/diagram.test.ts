import { describe, expect, it } from "vitest";
import { createWhiteboardDocument } from "../document";
import { editWhiteboardScene, prepareWhiteboardDiagram } from "./prepare";

const empty = createWhiteboardDocument("test");
const patch = { nodes: [{ id: "a", label: "需求" }, { id: "b", shape: "diamond" as const, label: "通过？" }], edges: [{ id: "ab", from: "a", to: "b", label: "评审" }] };

describe("incremental native whiteboard authoring", () => {
  it("creates editable nodes, bound labels and two-way arrow bindings", () => {
    const scene = editWhiteboardScene(empty.scene, patch);
    expect(scene.elements.find(e => e.id === "a")).toMatchObject({ type: "rectangle", boundElements: [{ id: "a:label", type: "text" }, { id: "ab", type: "arrow" }] });
    expect(scene.elements.find(e => e.id === "ab")).toMatchObject({ startBinding: { elementId: "a" }, endBinding: { elementId: "b" }, endArrowhead: "arrow" });
    expect(scene.elements.find(e => e.id === "ab:label")).toMatchObject({ text: "评审", containerId: "ab" });
    expect(empty.scene.elements).toEqual([]);
  });
  it("updates connections when a node moves and preserves unrelated native strokes/files", () => {
    const stroke = { id: "ink", type: "freedraw", x: 20, y: 40, width: 100, height: 80, points: [[0, 0], [100, 80]], customData: { owner: "user" } };
    const source = editWhiteboardScene({ ...empty.scene, elements: [stroke] }, patch);
    const next = editWhiteboardScene(source, { nodes: [{ id: "b", x: 600, label: "发布" }] });
    expect(next.elements.find(e => e.id === "ink")).toEqual(stroke);
    expect(next.elements.find(e => e.id === "b:label")?.text).toBe("发布");
    expect(next.elements.find(e => e.id === "ab")?.points).not.toEqual(source.elements.find(e => e.id === "ab")?.points);
    expect(next.files).toEqual(source.files);
  });
  it("deletes incident edges/labels while retaining the opposite node", () => {
    const next = editWhiteboardScene(editWhiteboardScene(empty.scene, patch), { remove: ["a"] });
    expect(next.elements.map(e => e.id)).toEqual(["b", "b:label"]);
    expect(next.elements[0]?.boundElements).toEqual([{ id: "b:label", type: "text" }]);
  });
  it("preserves hand-adjusted routing and binding order during label edits", () => {
    const source = { ...empty.scene, elements: editWhiteboardScene(empty.scene, patch).elements.map(element => ({ ...element })) };
    const arrow = source.elements.find(e => e.id === "ab")!;
    arrow.points = [[0, 0], [40, -80], [80, 0]];
    const shape = source.elements.find(e => e.id === "a")!;
    shape.boundElements = [{ id: "ab", type: "arrow" }, { id: "a:label", type: "text" }];
    const next = editWhiteboardScene(source, { nodes: [{ id: "b", label: "确认" }] });
    expect(next.elements.find(e => e.id === "ab")).toEqual(arrow);
    expect(next.elements.find(e => e.id === "a")).toEqual(shape);
    const moved = editWhiteboardScene(source, { nodes: [{ id: "a", y: 150 }] });
    const changed = moved.elements.find(e => e.id === "ab")!;
    const point = (changed.points as number[][])[1]!;
    expect([Number(changed.x) + point[0]!, Number(changed.y) + point[1]!]).toEqual([Number(arrow.x) + 40, Number(arrow.y) - 80]);
  });
  it("rejects unsupported elbow movement without erasing its route and allows label edits", () => {
    const source = { ...empty.scene, elements: editWhiteboardScene(empty.scene, patch).elements.map(element => ({ ...element })) };
    source.elements.find(e => e.id === "ab")!.elbowed = true;
    expect(() => editWhiteboardScene(source, { nodes: [{ id: "b", x: 600 }] })).toThrow(/折线/u);
    expect(() => editWhiteboardScene(source, { nodes: [{ id: "b", label: "确认" }] })).not.toThrow();
  });
  it("rejects dangling edges, ID collisions, unsafe fields and invalid dimensions", () => {
    for (const invalid of [{ edges: [{ id: "e", from: "a", to: "missing" }] }, { nodes: [{ id: "x" }, { id: "x" }] },
      { nodes: [{ id: "x", width: -1 }] }, { nodes: [{ id: "x", fill: "url(https://example.com)" }] }, { script: "alert(1)" }]) {
      expect(() => editWhiteboardScene(empty.scene, invalid as never)).toThrow();
    }
  });
  it("does not mutate the source when snapshot preparation fails", async () => {
    const before = JSON.stringify(empty);
    await expect(prepareWhiteboardDiagram(empty, patch, async () => { throw new Error("renderer unavailable"); })).rejects.toThrow("renderer unavailable");
    expect(JSON.stringify(empty)).toBe(before);
  });
});
