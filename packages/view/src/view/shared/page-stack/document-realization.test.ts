import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireHitTarget,
  QuireLayoutPage,
  QuireLayoutSnapshot
} from "@quirekit/view-engine";
import { retainQuireLayoutSnapshotForTest } from "@quirekit/view-engine/test-support/layout";
import { describe, expect, it } from "vitest";

import type { QuireViewRenderResult } from "../../types";
import { realizeMountedPaginatedDocument } from "./document-realization";

const documentRect: QuireRect = {
  x: 12,
  y: 24,
  width: 320,
  height: 480
};

const authoredPages: readonly QuireLayoutPage[] = [
  {
    pageIndex: 0,
    range: { from: 0, to: 10 },
    pageRect: { x: 12, y: 24, width: 320, height: 220 },
    bodyRect: { x: 28, y: 40, width: 288, height: 188 }
  },
  {
    pageIndex: 1,
    range: { from: 10, to: 20 },
    pageRect: { x: 12, y: 284, width: 320, height: 220 },
    bodyRect: { x: 28, y: 300, width: 288, height: 188 }
  }
];

describe("mounted paginated document realization", () => {
  it("retains authored pages and canonical page chunks", () => {
    const renderResult = createRenderResult({ pages: authoredPages });
    const pageDisplayListChunks = renderResult.pageDisplayListChunks;

    const realized = realizeMountedPaginatedDocument(renderResult);

    expect(realized.layoutSnapshot.pages).toBe(authoredPages);
    expect(realized.interactionSnapshot.pages).toBe(authoredPages);
    expect(realized.pageDisplayListChunks).toBe(pageDisplayListChunks);
  });

  it("promotes an unpaginated document to one explicit root page", () => {
    const renderResult = createRenderResult();

    const realized = realizeMountedPaginatedDocument(renderResult);

    expect(realized.layoutSnapshot.pages).toEqual([
      {
        pageIndex: 0,
        range: renderResult.layoutSnapshot.root.range,
        pageRect: documentRect,
        bodyRect: documentRect
      }
    ]);
    expect(realized.interactionSnapshot.pages)
      .toBe(realized.layoutSnapshot.pages);
  });

  it("rejects results without canonical retained page chunks", () => {
    const renderResult = createRenderResult({ withPageChunks: false });

    expect(() => realizeMountedPaginatedDocument(renderResult)).toThrow(
      "Mounted paginated document realization requires pageDisplayListChunks."
    );
  });

  it("rebuilds interaction target buckets from the realized pages", () => {
    const renderResult = createRenderResult({
      pages: authoredPages,
      interactionHitTargets: [
        {
          id: "page-1-control",
          range: { from: 12, to: 14 },
          rect: { x: 40, y: 320, width: 80, height: 24 },
          layer: { plane: "controls" }
        }
      ]
    });

    const realized = realizeMountedPaginatedDocument(renderResult);

    expect(realized.interactionSnapshot.layerTargetIndex?.buckets).toEqual([
      {
        bucketId: "page:0",
        pageIndex: 0,
        rect: authoredPages[0]!.pageRect,
        targetIds: []
      },
      {
        bucketId: "page:1",
        pageIndex: 1,
        rect: authoredPages[1]!.pageRect,
        targetIds: ["page-1-control"]
      }
    ]);
  });
});

/** Options for a mounted paginated realization fixture. */
interface CreateRenderResultOptions {
  /** Authored pages retained by the source layout snapshot. */
  readonly pages?: readonly QuireLayoutPage[] | undefined;
  /** Interaction targets that must be re-indexed against realized pages. */
  readonly interactionHitTargets?: readonly QuireHitTarget[] | undefined;
  /** Whether the fixture carries canonical retained page chunks. */
  readonly withPageChunks?: boolean | undefined;
}

/**
 * Creates the minimal render result consumed by document realization.
 *
 * @param options - Optional pages, interaction targets, and chunk availability.
 * @returns Render result fixture for mounted document realization.
 */
function createRenderResult(
  options: CreateRenderResultOptions = {}
): QuireViewRenderResult {
  const layoutSnapshot = retainQuireLayoutSnapshotForTest({
    state: { tag: "layout" } as unknown as QuireLayoutSnapshot["state"],
    documentRect,
    viewportRect: { x: 0, y: 0, width: 160, height: 180 },
    domOverlays: [],
    hitTargets: [],
    ...(options.pages === undefined ? {} : { pages: options.pages }),
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 20 },
      rect: documentRect,
      children: []
    }
  });
  const interactionSnapshot = retainQuireLayoutSnapshotForTest({
    ...layoutSnapshot,
    hitTargets: options.interactionHitTargets ?? []
  });

  return {
    layoutSnapshot,
    interactionSnapshot,
    ...(options.withPageChunks === false
      ? {}
      : {
          pageDisplayListChunks: {
            chunks: [],
            chunksByPageIndex: {}
          }
        })
  } as unknown as QuireViewRenderResult;
}
