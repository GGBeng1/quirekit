import { describe, expect, it } from "vitest";
import {
  createQuireViewLayerTargetIndex,
  queryQuireViewLayerTargetIndexAtPointWithDiagnostics
} from "./indexer";

describe("view graph layer target index", () => {
  it("buckets retained targets by page and queries only the containing page", () => {
    const index = createQuireViewLayerTargetIndex({
      targets: [
        {
          targetId: "page-0-control",
          rect: { x: 20, y: 30, width: 10, height: 10 }
        },
        {
          targetId: "page-1-selection",
          rect: { x: 20, y: 250, width: 100, height: 24 }
        },
        {
          targetId: "floating-ui",
          rect: { x: 320, y: 10, width: 80, height: 40 }
        }
      ],
      pages: [
        {
          pageIndex: 0,
          rect: { x: 0, y: 0, width: 300, height: 180 }
        },
        {
          pageIndex: 1,
          rect: { x: 0, y: 220, width: 300, height: 180 }
        }
      ]
    });

    expect(index.buckets.map((bucket) => bucket.targetIds)).toEqual([
      ["page-0-control"],
      ["page-1-selection"]
    ]);
    expect(index.unbucketedTargetIds).toEqual(["floating-ui"]);
    expect(
      queryQuireViewLayerTargetIndexAtPointWithDiagnostics(index, {
        x: 22,
        y: 32
      }).targetIds
    ).toEqual(["page-0-control", "floating-ui"]);
    expect(
      queryQuireViewLayerTargetIndexAtPointWithDiagnostics(index, {
        x: 24,
        y: 260
      }).targetIds
    ).toEqual(["page-1-selection", "floating-ui"]);
  });

  it("reports bucket diagnostics for retained layer target queries", () => {
    const index = createQuireViewLayerTargetIndex({
      targets: [
        {
          targetId: "page-0-control",
          rect: { x: 20, y: 30, width: 10, height: 10 }
        },
        {
          targetId: "floating-ui",
          rect: { x: 320, y: 10, width: 80, height: 40 }
        }
      ],
      pages: [
        {
          pageIndex: 0,
          rect: { x: 0, y: 0, width: 300, height: 180 }
        }
      ]
    });

    expect(
      queryQuireViewLayerTargetIndexAtPointWithDiagnostics(index, { x: 22, y: 32 })
    ).toEqual({
      targetIds: ["page-0-control", "floating-ui"],
      buckets: [
        {
          bucketId: "page:0",
          pageIndex: 0,
          targetIds: ["page-0-control"]
        }
      ],
      unbucketedTargetIds: ["floating-ui"],
      source: "retained-layer-target-index"
    });
  });

  it("buckets retained targets by viewport when no pages exist", () => {
    const index = createQuireViewLayerTargetIndex({
      targets: [
        {
          targetId: "visible-control",
          rect: { x: 20, y: 30, width: 10, height: 10 }
        },
        {
          targetId: "offscreen-floating-ui",
          rect: { x: 420, y: 30, width: 80, height: 40 }
        }
      ],
      viewports: [
        {
          viewportId: "snapshot",
          rect: { x: 0, y: 0, width: 300, height: 180 }
        }
      ]
    });

    expect(index.buckets).toEqual([
      {
        bucketId: "viewport:snapshot",
        rect: { x: 0, y: 0, width: 300, height: 180 },
        targetIds: ["visible-control"]
      }
    ]);
    expect(index.unbucketedTargetIds).toEqual(["offscreen-floating-ui"]);
    expect(
      queryQuireViewLayerTargetIndexAtPointWithDiagnostics(index, { x: 22, y: 32 })
    ).toEqual({
      targetIds: ["visible-control", "offscreen-floating-ui"],
      buckets: [
        {
          bucketId: "viewport:snapshot",
          targetIds: ["visible-control"]
        }
      ],
      unbucketedTargetIds: ["offscreen-floating-ui"],
      source: "retained-layer-target-index"
    });
  });
});
