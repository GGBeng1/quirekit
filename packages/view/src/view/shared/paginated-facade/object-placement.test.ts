import { describe, expect, it } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { readMountedObjectPlacement } from "./object-placement";

/** @returns Minimal accepted source/occurrence geometry; client bounds are intentionally unrelated. */
function fixture(): QuireViewRenderResult {
  return { layoutSnapshot: {
    placementAnchors: [{ sourceAnchorId: "source", occurrence: { kind: "page", visualInstanceId: "page:2" }, placementReferences: {
      page: { x: 0, y: 1000 }, column: { x: 80, y: 1080 }, paragraph: { x: 80, y: 1200 }
    } }],
    layerContributions: [{ paintSurface: "content", owner: { source: { sourceId: "source" }, region: { visualInstanceId: "page:2" } }, rect: { x: 100, y: 1250, width: 200, height: 100 } }]
  }, interactionSnapshot: { hitTargets: [{ id: "target", source: { sourceId: "source" }, viewRegion: { visualInstanceId: "page:2" }, rect: { x: 50, y: 80, width: 400, height: 200 } }] } } as unknown as QuireViewRenderResult;
}
describe("mounted object placement", () => {
  it("returns unrotated document geometry for the exact retained occurrence", () => {
    expect(readMountedObjectPlacement(fixture(), ["target"])).toEqual({ coordinateSpace: "document", rect: { x: 100, y: 1250, width: 200, height: 100 }, page: { x: 0, y: 1000 }, column: { x: 80, y: 1080 }, paragraph: { x: 80, y: 1200 } });
  });
  it("does not invent origins for a stale target or ambiguous occurrence", () => {
    expect(readMountedObjectPlacement(fixture(), ["other"])).toBeUndefined();
    const current = fixture();
    const duplicate = { ...current, layoutSnapshot: { ...current.layoutSnapshot, placementAnchors: [...current.layoutSnapshot.placementAnchors!, ...current.layoutSnapshot.placementAnchors!] } };
    expect(readMountedObjectPlacement(duplicate, ["target"])).toBeUndefined();
  });
});
