import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import {
  projectEditorUIAnchorGeometry,
  resolveEditorUIAnchorGeometry
} from ".";

describe("Editor UI anchor client projection", () => {
  it("projects every document rect through one mounted surface authority", () => {
    const geometry = resolveEditorUIAnchorGeometry({
      snapshot: createProjectionSnapshot(),
      request: {
        kind: "virtual",
        rect: { x: 20, y: 30, width: 40, height: 20 },
        expectedSnapshotVersion: 11
      }
    });

    expect(projectEditorUIAnchorGeometry({
      geometry,
      surfaceClientRect: { left: 100, top: 50, width: 600, height: 400 },
      surfaceBounds: { x: 10, y: 20, width: 300, height: 200 }
    })).toEqual({
      status: "ready",
      kind: "virtual",
      coordinateSpace: "client",
      snapshotVersion: 11,
      rects: [{ x: 120, y: 70, width: 80, height: 40 }],
      referenceRect: { x: 120, y: 70, width: 80, height: 40 },
      sourceTargetIds: []
    });
  });

  it("keeps stale results and rejects invalid mounted projections", () => {
    expect(projectEditorUIAnchorGeometry({
      geometry: {
        status: "stale",
        kind: "node",
        expectedSnapshotVersion: 10,
        snapshotVersion: 11
      },
      surfaceClientRect: { left: 0, top: 0, width: 300, height: 200 },
      surfaceBounds: { x: 0, y: 0, width: 300, height: 200 }
    })).toEqual({
      status: "stale",
      kind: "node",
      expectedSnapshotVersion: 10,
      snapshotVersion: 11
    });

    expect(projectEditorUIAnchorGeometry({
      geometry: resolveEditorUIAnchorGeometry({
        snapshot: createProjectionSnapshot(),
        request: {
          kind: "virtual",
          rect: { x: 20, y: 30, width: 40, height: 20 },
          expectedSnapshotVersion: 11
        }
      }),
      surfaceClientRect: {
        left: 0,
        top: 0,
        width: Number.POSITIVE_INFINITY,
        height: 200
      },
      surfaceBounds: { x: 0, y: 0, width: 300, height: 200 }
    })).toEqual({
      status: "unsupported",
      kind: "virtual",
      snapshotVersion: 11,
      reason: "surface-projection-invalid"
    });
  });
});

/**
 * Creates a versioned retained snapshot for projection tests.
 *
 * @returns Snapshot carrying an explicit document-space surface.
 */
function createProjectionSnapshot(): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 10, y: 20, width: 300, height: 200 },
    viewportRect: { x: 10, y: 20, width: 300, height: 200 },
    domOverlays: [],
    hitTargets: [],
    viewGraph: { version: 11 } as QuireLayoutSnapshot["viewGraph"],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 0 },
      rect: { x: 10, y: 20, width: 300, height: 200 },
      children: []
    }
  } as QuireLayoutSnapshot;
}
