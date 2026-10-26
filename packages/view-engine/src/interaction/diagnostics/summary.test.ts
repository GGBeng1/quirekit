import { describe, expect, it } from "vitest";
import {
  createQuireInteractionGeometryDiagnostics,
  createQuireInteractionCommandRouteDiagnostics,
  createQuireInteractionSelectionTargetDiagnostics,
  mergeQuireInteractionDiagnostics
} from "./index";

const bodyRegion = {
  rootId: { value: "root:body" },
  regionId: { value: "region:body" },
  kind: "body"
} as const;

describe("interaction diagnostics summaries", () => {
  it("uses query-product owner facts as root-region diagnostics", () => {
    const diagnostics = createQuireInteractionGeometryDiagnostics({
      source: "sub-layout-input-anchor",
      queryOwner: {
        sourceRootId: "table-cell:semantic-a:cell-a",
        sourceFragmentId: "cell-a#p2",
        coordinateSpace: "document",
        sourceCoordinateSpace: "table-cell-local",
        coordinatePath: {
          spaces: ["table-cell-local", "document"],
          steps: [
            {
              from: "table-cell-local",
              to: "document",
              input: { space: "table-cell-local", x: 0, y: 0 },
              output: { space: "document", x: 120, y: 240 },
              scaleX: 1,
              scaleY: 1
            }
          ]
        },
        region: bodyRegion
      }
    });

    expect(diagnostics).toEqual(expect.objectContaining({
      rootRegion: {
        root: bodyRegion.rootId,
        region: bodyRegion
      },
      queryOwner: expect.objectContaining({
        sourceRootId: "table-cell:semantic-a:cell-a",
        coordinateSpace: "document",
        sourceCoordinateSpace: "table-cell-local",
        coordinatePath: expect.objectContaining({
          spaces: ["table-cell-local", "document"]
        })
      })
    }));
  });

  it("merges selection target and command-route facts without dropping hit provenance", () => {
    const base = createQuireInteractionSelectionTargetDiagnostics({
      domain: "object",
      commandTarget: "object",
      hitKind: "object",
      region: bodyRegion,
      layer: { plane: "drawing" },
      pointerPolicy: { kind: "select" },
      interactionHit: {
        kind: "object",
        region: bodyRegion,
        objectId: "drawing-1"
      }
    });
    const patch = createQuireInteractionCommandRouteDiagnostics({
      routeKind: "object",
      intent: "delete",
      selectionDomain: "object",
      targetKind: "object",
      activeRoot: bodyRegion.rootId,
      activeRegion: bodyRegion,
      consumer: "object-domain",
      effect: "unsupported-action"
    });

    expect(mergeQuireInteractionDiagnostics(base, patch)).toEqual(
      expect.objectContaining({
        rootRegion: {
          root: bodyRegion.rootId,
          region: bodyRegion
        },
        layer: { plane: "drawing" },
        pointerPolicy: { kind: "select" },
        selection: {
          domain: "object",
          commandTarget: "object",
          hitKind: "object",
          routeKind: "object",
          intent: "delete",
          consumer: "object-domain",
          effect: "unsupported-action"
        }
      })
    );
  });

  it("deduplicates fallback usage while appending diagnostics", () => {
    const base = {
      migrationFallbacks: [
        {
          kind: "layout-snapshot-geometry-adapter" as const,
          source: "layout-caret" as const,
          reason: "Geometry is still read from layout snapshot traversal while retained query products converge."
        }
      ]
    };
    const patch = {
      migrationFallbacks: [
        {
          kind: "layout-snapshot-geometry-adapter" as const,
          source: "layout-caret" as const,
          reason: "Geometry is still read from layout snapshot traversal while retained query products converge."
        },
        {
          kind: "viewport-rect-fallback" as const,
          source: "viewport-fallback" as const,
          reason: "No retained geometry matched, so the viewport rectangle was used."
        }
      ]
    };

    expect(
      mergeQuireInteractionDiagnostics(base, patch)?.migrationFallbacks
    ).toEqual([
      expect.objectContaining({ kind: "layout-snapshot-geometry-adapter" }),
      expect.objectContaining({ kind: "viewport-rect-fallback" })
    ]);
  });
});
