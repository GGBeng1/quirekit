import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  resolveQuirePageStackDisplayListSourceForFrame,
  resolveQuirePageStackDisplayListsForFrames
} from "./display-list-resolver";
import type {
  QuirePageStackDisplayListChunkIndex,
  QuirePageStackDisplayListFrame
} from "./types";

describe("resolveQuirePageStackDisplayListsForFrames", () => {
  it("resolves retained chunks for requested frames", () => {
    const frames = [
      frame(0, { x: 0, y: 0, width: 100, height: 80 }),
      frame(1, { x: 0, y: 100, width: 100, height: 80 })
    ];
    const chunks = chunkIndex([
      chunk(0, frames[0]!.pageRect, "first-content", "first-overlay"),
      chunk(1, frames[1]!.pageRect, "second-content", "second-overlay")
    ]);

    const contentLists = resolveQuirePageStackDisplayListsForFrames({
      frames,
      pageDisplayListChunks: chunks,
      layer: "content"
    });
    const overlayLists = resolveQuirePageStackDisplayListsForFrames({
      frames,
      pageDisplayListChunks: chunks,
      layer: "overlay"
    });

    expect(contentLists.map((list) => list.commands[0]?.id))
      .toEqual(["first-content", "second-content"]);
    expect(overlayLists.map((list) => list.commands[0]?.id))
      .toEqual(["first-overlay", "second-overlay"]);
  });

  it("throws when any requested frame lacks a retained chunk", () => {
    const frames = [
      frame(0, { x: 0, y: 0, width: 100, height: 80 }),
      frame(1, { x: 0, y: 100, width: 100, height: 80 })
    ];
    const chunks = chunkIndex([
      chunk(0, frames[0]!.pageRect, "first-content", "first-overlay")
    ]);

    expect(() => resolveQuirePageStackDisplayListsForFrames({
      frames,
      pageDisplayListChunks: chunks,
      layer: "content"
    })).toThrow("Missing page-stack display-list chunk for page 1");
  });
});

describe("resolveQuirePageStackDisplayListSourceForFrame", () => {
  it("returns retained chunks as viewport-scoped display-list sources", () => {
    const firstFrame = frame(0, { x: 0, y: 0, width: 100, height: 80 });
    const chunks = chunkIndex([
      chunk(0, firstFrame.pageRect, "content", "overlay")
    ]);

    const contentSource = resolveQuirePageStackDisplayListSourceForFrame({
      frame: firstFrame,
      pageDisplayListChunks: chunks,
      layer: "content"
    });
    const overlaySource = resolveQuirePageStackDisplayListSourceForFrame({
      frame: firstFrame,
      pageDisplayListChunks: chunks,
      layer: "overlay"
    });

    expect(contentSource.displayList.commands[0]?.id).toBe("content");
    expect(contentSource.chunkKey).toBe("page:0");
    expect(contentSource.sourceOwnerKeys).toEqual(["layout-node:page-0"]);
    expect(contentSource.displayListIsViewportScoped).toBe(true);
    expect(overlaySource.displayList.commands[0]?.id).toBe("overlay");
    expect(overlaySource.displayListIsViewportScoped).toBe(true);
  });

  it("throws when a retained chunk is missing", () => {
    const missingFrame = frame(1, { x: 0, y: 100, width: 100, height: 80 });
    const chunks = chunkIndex([
      chunk(0, { x: 0, y: 0, width: 100, height: 80 }, "content", "overlay")
    ]);

    expect(() => resolveQuirePageStackDisplayListSourceForFrame({
      frame: missingFrame,
      pageDisplayListChunks: chunks,
      layer: "content"
    })).toThrow("Missing page-stack display-list chunk for page 1");
  });
});

/**
 * Creates a minimal page-stack frame descriptor.
 *
 * @param pageIndex - Zero-based page index.
 * @param pageRect - Page rectangle in document space.
 * @returns Page-stack display-list frame.
 */
function frame(
  pageIndex: number,
  pageRect: QuireRect
): QuirePageStackDisplayListFrame {
  return { pageIndex, pageRect };
}

/**
 * Creates a sparse chunk index for tests.
 *
 * @param chunks - Page-local chunks.
 * @returns Chunk index with page-index lookup.
 */
function chunkIndex(
  chunks: QuirePageStackDisplayListChunkIndex["chunks"]
): QuirePageStackDisplayListChunkIndex {
  return {
    chunks,
    chunksByPageIndex: Object.fromEntries(chunks.map((chunk) => [
      chunk.pageIndex,
      chunk
    ]))
  };
}

/**
 * Creates one page-local chunk with distinguishable content and overlay commands.
 *
 * @param pageIndex - Page index owned by the chunk.
 * @param pageRect - Page rectangle in document space.
 * @param contentId - Content command id.
 * @param overlayId - Overlay command id.
 * @returns Page-stack display-list chunk.
 */
function chunk(
  pageIndex: number,
  pageRect: QuireRect,
  contentId: string,
  overlayId: string
): QuirePageStackDisplayListChunkIndex["chunks"][number] {
  return {
    retainedRecord: {
      key: `page:${pageIndex}`,
      kind: "page-local",
      rect: pageRect,
      pageIndex,
      pageRect
    },
    sourceOwnerKeys: [`layout-node:page-${pageIndex}`],
    pageIndex,
    pageRect,
    contentDirtyBounds: pageRect,
    overlayDirtyBounds: pageRect,
    contentDisplayList: displayList(contentId, pageRect),
    overlayDisplayList: displayList(overlayId, pageRect)
  };
}

/**
 * Creates a display list with one text command.
 *
 * @param id - Command id and text.
 * @param bounds - Optional display-list bounds.
 * @returns Display list containing one text command.
 */
function displayList(
  id: string,
  bounds: QuireRect = { x: 0, y: 0, width: 100, height: 80 }
): QuireDisplayList {
  return {
    bounds,
    commands: [textCommand(id, bounds.y + 8)]
  };
}

/**
 * Creates a text display command at the supplied y coordinate.
 *
 * @param id - Command id and text.
 * @param y - Command top in document space.
 * @returns Text display command.
 */
function textCommand(id: string, y: number): QuireDisplayCommand {
  return {
    id,
    kind: "text",
    rect: { x: 8, y, width: 32, height: 20 },
    text: id,
    origin: { x: 8, y: y + 16 },
    font: "16px sans-serif",
    fillStyle: "#111827"
  };
}
