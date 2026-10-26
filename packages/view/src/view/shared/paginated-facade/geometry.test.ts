import type { EditorUIAnchorRequest } from "@quirekit/editor-ui";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { createMountedPaginatedGeometryFacade } from "./geometry";

describe("mounted paginated Editor UI anchor geometry", () => {
  it("projects a versioned snapshot product through the mounted surface", () => {
    const facade = createMountedPaginatedGeometryFacade({
      backendLabel: "Test",
      readRenderResult: () => createRenderResult(),
      readSurface: () => ({
        clientRect: { left: 100, top: 50, width: 400, height: 200 },
        surfaceBounds: { x: 0, y: 0, width: 200, height: 100 }
      }),
      readSelectionContext: () => undefined
    });

    expect(facade.resolveUIAnchor(createVirtualRequest(17))).toEqual({
      status: "ready",
      kind: "virtual",
      coordinateSpace: "client",
      snapshotVersion: 17,
      rects: [{ x: 140, y: 90, width: 60, height: 40 }],
      referenceRect: { x: 140, y: 90, width: 60, height: 40 },
      sourceTargetIds: []
    });
    expect(facade.resolveUIAnchor(createObjectRequest(17))).toEqual({
      status: "ready",
      kind: "object",
      coordinateSpace: "client",
      snapshotVersion: 17,
      objectId: "picture-1",
      rects: [{ x: 200, y: 70, width: 60, height: 40 }],
      referenceRect: { x: 200, y: 70, width: 60, height: 40 },
      sourceTargetIds: ["object:picture-1"]
    });
    expect(facade.getObjectAnchor(
      "picture-1",
      { targetId: "object:picture-1" }
    )).toEqual({
      status: "ready",
      kind: "object",
      coordinateSpace: "client",
      snapshotVersion: 17,
      objectId: "picture-1",
      rects: [{ x: 200, y: 70, width: 60, height: 40 }],
      referenceRect: { x: 200, y: 70, width: 60, height: 40 },
      sourceTargetIds: ["object:picture-1"]
    });
  });

  it("keeps stale and unsupported states explicit", () => {
    const renderResult = createRenderResult();
    const facade = createMountedPaginatedGeometryFacade({
      backendLabel: "Test",
      readRenderResult: () => renderResult,
      readSurface: () => ({
        clientRect: { left: 0, top: 0, width: 200, height: 100 }
      }),
      readSelectionContext: () => undefined
    });

    expect(facade.resolveUIAnchor(createVirtualRequest(16))).toEqual({
      status: "stale",
      kind: "virtual",
      expectedSnapshotVersion: 16,
      snapshotVersion: 17
    });
    expect(facade.resolveUIAnchor(createVirtualRequest(17))).toEqual({
      status: "unsupported",
      kind: "virtual",
      snapshotVersion: 17,
      reason: "surface-projection-invalid"
    });

    const pendingFacade = createMountedPaginatedGeometryFacade({
      backendLabel: "Test",
      readRenderResult: () => undefined,
      readSurface: () => ({
        clientRect: { left: 0, top: 0, width: 200, height: 100 }
      }),
      readSelectionContext: () => undefined
    });
    expect(pendingFacade.getObjectAnchor("picture-1")).toEqual({
      status: "unsupported",
      kind: "object",
      reason: "snapshot-version-unavailable"
    });
  });
});

/**
 * Creates an explicit virtual anchor request for the mounted facade.
 *
 * @param expectedSnapshotVersion - Retained revision expected by the caller.
 * @returns Version-bound virtual anchor request.
 */
function createVirtualRequest(
  expectedSnapshotVersion: number
): EditorUIAnchorRequest {
  return {
    kind: "virtual",
    expectedSnapshotVersion,
    rect: { x: 20, y: 20, width: 30, height: 20 }
  };
}

/**
 * Creates an exact retained object anchor request for the mounted facade.
 *
 * @param expectedSnapshotVersion - Retained revision expected by the caller.
 * @returns Version-bound object anchor request.
 */
function createObjectRequest(
  expectedSnapshotVersion: number
): EditorUIAnchorRequest {
  return {
    kind: "object",
    objectId: "picture-1",
    occurrence: { targetId: "object:picture-1" },
    expectedSnapshotVersion
  };
}

/**
 * Creates the minimal committed render result consumed by anchor projection.
 *
 * @returns Versioned retained interaction snapshot fixture.
 */
function createRenderResult(): QuireViewRenderResult {
  const snapshot = createSnapshot();
  return {
    interactionSnapshot: snapshot,
    layoutSnapshot: snapshot
  } as QuireViewRenderResult;
}

/**
 * Creates one retained interaction snapshot for mounted projection tests.
 *
 * @returns Finite document-space snapshot with a stable version.
 */
function createSnapshot(): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 200, height: 100 },
    viewportRect: { x: 0, y: 0, width: 200, height: 100 },
    domOverlays: [],
    hitTargets: [{
      id: "object:picture-1",
      range: { from: 1, to: 2 },
      rect: { x: 50, y: 10, width: 30, height: 20 },
      interactionHit: {
        kind: "object",
        objectId: "picture-1",
        region: {
          rootId: { value: "root:picture-1" },
          regionId: { value: "region:picture-1" },
          kind: "floating-object"
        }
      }
    }],
    viewGraph: { version: 17 } as QuireLayoutSnapshot["viewGraph"],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 0 },
      rect: { x: 0, y: 0, width: 200, height: 100 },
      children: []
    }
  } as QuireLayoutSnapshot;
}
