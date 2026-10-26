import { describe, expect, it } from "vitest";
import type { Canvas2DRenderTarget } from "@quirekit/renderer";
import type { QuireSelectionGeometryContext } from "@quirekit/view-engine";
import type {
  CanvasMountedContentSurfaceState,
  CanvasMountedSurfaceMetrics
} from "./surface";
import {
  createCanvasMountedBuildOptions,
  createCanvasMountedRenderOptions
} from "./render-pass";
import type { QuireMountedEditorView } from "../shared";

const selectionContext: QuireSelectionGeometryContext = {
  referenceRect: { x: 10, y: 20, width: 30, height: 40 },
  viewRegion: {
    rootId: { value: "root" },
    regionId: { value: "cell" },
    visualInstanceId: "page-5",
    kind: "table-cell"
  },
  queryOwner: {
    sourceRootId: "root",
    sourceFragmentId: "cell#p5",
    coordinateSpace: "document"
  }
};

describe("Canvas mounted render pass options", () => {
  it("retains selection context for targetless page-stack builds", () => {
    const options = createCanvasMountedBuildOptions({
      metrics: createSurfaceMetrics(),
      decorationSourceView: {} as QuireMountedEditorView,
      selectionContext
    });

    expect(options.selectionContext).toBe(selectionContext);
  });

  it("retains selection context for single-surface full renders", () => {
    const options = createCanvasMountedRenderOptions({
      surfaceState: createSurfaceState(),
      decorationSourceView: {} as QuireMountedEditorView,
      selectionContext
    });

    expect(options.selectionContext).toBe(selectionContext);
  });

  it("forwards the configured list-marker collision policy", () => {
    const options = createCanvasMountedBuildOptions({
      metrics: createSurfaceMetrics(),
      decorationSourceView: {} as QuireMountedEditorView,
      runtime: { listMarkerCollision: "word-compatible" }
    });

    expect(options.listMarkerCollision).toBe("word-compatible");
  });

  it("forwards the configured hidden-text view mode", () => {
    const options = createCanvasMountedBuildOptions({
      metrics: createSurfaceMetrics(),
      decorationSourceView: {} as QuireMountedEditorView,
      runtime: { hiddenTextViewMode: "formatting-inspection" }
    });

    expect(options.hiddenTextViewMode).toBe("formatting-inspection");
  });
});

/**
 * Creates mounted surface metrics for render-pass option tests.
 *
 * @returns Minimal mounted surface metrics.
 */
function createSurfaceMetrics(): CanvasMountedSurfaceMetrics {
  return {
    displaySize: { width: 100, height: 80 },
    devicePixelRatio: 1,
    viewportRect: { x: 0, y: 0, width: 100, height: 80 },
    surfaceBounds: { x: 0, y: 0, width: 100, height: 80 }
  };
}

/**
 * Creates mounted single-surface state for render-pass option tests.
 *
 * @returns Minimal mounted surface state with a content target.
 */
function createSurfaceState(): CanvasMountedContentSurfaceState {
  return {
    ...createSurfaceMetrics(),
    contentTarget: {} as Canvas2DRenderTarget
  };
}
