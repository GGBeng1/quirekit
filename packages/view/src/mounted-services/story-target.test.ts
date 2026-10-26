import { hitTestQuireDocumentPointNearestCaret, type QuireLayoutNode, type QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import {
  listMountedStoryInstances,
  pickNearestMountedStoryInstance,
  resolveMountedStoryTextTarget
} from "./story-target";

describe("mounted story text targets", () => {
  it("activates note text even when its first caret is covered by a numbering control", () => {
    const region = { rootId: { value: "note-root" }, regionId: { value: "note-region" }, kind: "footnote" as const,
      visualInstanceId: "page:0:note" };
    const source = { sourceId: "note-story", range: { from: 10, to: 12 } };
    const capabilities = { editable: true, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true };
    const rect = { x: 100, y: 800, width: 200, height: 24 };
    const paragraph: QuireLayoutNode = { id: "note-paragraph", kind: "block", range: source.range, rect,
      layoutOwner: { region, source, capabilities }, textFragments: [{
        id: "empty-note", text: "", range: { from: 11, to: 11 }, rect: { ...rect, width: 0 },
        font: "16px sans-serif", lineHeight: 24, baseline: 820,
        caretStops: [{ position: { pos: 11, bias: 0 }, localX: 0 }]
      }] };
    const note: QuireLayoutNode = { id: "note", kind: "block", range: source.range, rect,
      layoutOwner: { region, source, capabilities }, children: [paragraph] };
    const controlRegion = { rootId: { value: "marker-root" }, regionId: { value: "marker-region" }, kind: "block-container" as const };
    const snapshot: QuireLayoutSnapshot = { ...createSnapshot([note]), documentRect: rect, domOverlays: [], hitTargets: [{
      id: "number-marker", range: source.range, rect: { ...rect, width: 18 },
      layer: { plane: "controls" }, pointerPolicy: { kind: "dispatch" },
      interactionHit: { kind: "widget", widgetId: "number-marker", part: "marker", region: controlRegion,
        source: { sourceId: "number-marker" }, capabilities }
    }] };
    const pointer = hitTestQuireDocumentPointNearestCaret(snapshot, { x: 100.5, y: 812 });
    expect(pointer.kind === "position" && pointer.interactionHit?.kind).toBe("widget");
    expect(resolveMountedStoryTextTarget(snapshot, 11)?.target).toMatchObject({
      domain: "text", commandTarget: "editable-text", region, source, capabilities
    });
  });

  it("lists one occurrence per page band and skips the body", () => {
    const snapshot = createSnapshot([
      band("header", "page-1", 0, 10),
      bodyNode(),
      band("header", "page-2", 1000, 10),
      band("footer", "page-2-footer", 1900, 50)
    ]);

    const instances = listMountedStoryInstances(snapshot, 12);
    expect(instances.map((instance) => instance.region.visualInstanceId)).toEqual(["page-1", "page-2"]);
    expect(instances.every((instance) => instance.sourceId === "header-story")).toBe(true);
    expect(listMountedStoryInstances(snapshot, 55)).toHaveLength(1);
  });

  it("picks the occurrence nearest the viewport center", () => {
    const snapshot = createSnapshot([band("header", "page-1", 0, 10), band("header", "page-2", 1000, 10)]);
    const instances = listMountedStoryInstances(snapshot, 12);

    expect(pickNearestMountedStoryInstance(instances, { x: 0, y: 900, width: 800, height: 400 })
      ?.region.visualInstanceId).toBe("page-2");
    expect(pickNearestMountedStoryInstance(instances, { x: 0, y: 0, width: 800, height: 400 })
      ?.region.visualInstanceId).toBe("page-1");
    expect(pickNearestMountedStoryInstance([], { x: 0, y: 0, width: 1, height: 1 })).toBeUndefined();
  });
});

/**
 * @param kind - Story band kind.
 * @param visualInstanceId - Page-local occurrence id.
 * @param y - Band top in document coordinates.
 * @param from - First document position of the story occurrence.
 * @returns Band container with one nested line.
 */
function band(kind: "header" | "footer", visualInstanceId: string, y: number, from: number): QuireLayoutNode {
  const sourceId = `${kind}-story`;
  const range = { from, to: from + 20 };
  return {
    id: `${visualInstanceId}-container`,
    kind: "container",
    range,
    rect: { x: 0, y, width: 600, height: 40 },
    layoutOwner: {
      region: { kind, visualInstanceId },
      source: { sourceId }
    },
    children: [{ id: `${visualInstanceId}-line`, kind: "line", range, rect: { x: 0, y, width: 600, height: 20 } }]
  } as unknown as QuireLayoutNode;
}

/** @returns Body container covering the story positions without story ownership. */
function bodyNode(): QuireLayoutNode {
  return {
    id: "body",
    kind: "container",
    range: { from: 0, to: 100 },
    rect: { x: 0, y: 50, width: 600, height: 900 },
    children: []
  } as unknown as QuireLayoutNode;
}

/**
 * @param children - Root children.
 * @returns Minimal snapshot exposing a layout tree.
 */
function createSnapshot(children: readonly QuireLayoutNode[]): QuireLayoutSnapshot {
  return {
    root: { id: "root", kind: "root", range: { from: 0, to: 100 }, rect: { x: 0, y: 0, width: 800, height: 2000 }, children },
    viewportRect: { x: 0, y: 0, width: 800, height: 600 }
  } as unknown as QuireLayoutSnapshot;
}
