import {
  doesQuireRectIntersectAny,
  type QuireDisplayCommand,
  type QuireDisplayList,
  type QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutPage } from "../../layout";
import type { QuireRetainedDisplayOwnerCommandSegment } from "../types";
import {
  expandQuireDisplayChunkRectUnion,
  readQuireDisplayChunkDisplayCommandDirtyBounds
} from "./dirty-bounds";
import { createQuirePageStackDisplayListChunkIndex } from "./indexer";
import type {
  QuirePageStackDisplayListChunk,
  QuirePageStackDisplayListChunkIndex,
  QuirePageStackDisplayListChunkRecord,
  RealizeQuirePageStackDisplayOwnerChunksOptions
} from "./types";

/** Mutable command bucket for one page rectangle. */
interface QuirePageDisplayListBucketWriter {
  /** Page-local rectangle used for command intersection tests. */
  readonly viewportRect: QuireRect;
  /** Commands retained for this rectangle. */
  readonly commands: QuireDisplayCommand[];
  /** Page-clipped union of retained command paint bounds. */
  dirtyBounds: QuireRect | null;
}

/**
 * Filters a display list into multiple page rectangles with one command walk.
 *
 * @param displayList - Document-space display list to bucket.
 * @param viewportRects - Page rectangles that should receive intersecting commands.
 * @returns Display lists matching `viewportRects` order.
 */
export function createQuirePageStackDisplayListsForRects(
  displayList: QuireDisplayList,
  viewportRects: readonly QuireRect[]
): readonly QuireDisplayList[] {
  const buckets = createBuckets(viewportRects);
  for (const command of displayList.commands) {
    appendCommand(command, buckets);
  }
  return buckets.map((bucket) => ({ ...displayList, commands: bucket.commands }));
}

/**
 * Realizes page-local display lists from direct retained owner chunks.
 *
 * Owner membership is selected before geometry clips command trees. This keeps
 * repeated visual occurrences and paint ordering bound to canonical ownership.
 *
 * @param options - Pages, owner graph, direct owner chunks, and active clips.
 * @returns Sparse page-local chunk index for mounted and targetless consumers.
 */
export function realizeQuirePageStackDisplayOwnerChunks(
  options: RealizeQuirePageStackDisplayOwnerChunksOptions
): QuirePageStackDisplayListChunkIndex {
  const pages = filterPages(options.pages, options.clipRects);
  const chunks = pages.map((page) => {
    const contentBucket = createBuckets([page.pageRect])[0]!;
    const overlayBucket = createBuckets([page.pageRect])[0]!;
    const sourceOwnerKeys = options.ownerIndex.ownerKeysByPageIndex[page.pageIndex] ?? [];
    const segments: QuireRetainedDisplayOwnerCommandSegment[] = [];

    for (const ownerKey of sourceOwnerKeys) {
      const ownerChunk = options.ownerChunks.chunksByOwnerKey[ownerKey];
      if (ownerChunk !== undefined) {
        segments.push(...ownerChunk.segments);
      }
    }
    segments.sort((left, right) =>
      left.paintOrder - right.paintOrder || left.sequence - right.sequence
    );
    for (const segment of segments) {
      const bucket = segment.lane === "content" ? contentBucket : overlayBucket;
      for (const command of segment.commands) {
        appendCommand(command, [bucket]);
      }
    }

    const retainedRecord = createPageRecord(page);
    return {
      retainedRecord,
      sourceOwnerKeys,
      pageIndex: page.pageIndex,
      pageRect: page.pageRect,
      contentDirtyBounds: contentBucket.dirtyBounds,
      overlayDirtyBounds: overlayBucket.dirtyBounds,
      contentDisplayList: { bounds: options.bounds, commands: contentBucket.commands },
      overlayDisplayList: { bounds: options.bounds, commands: overlayBucket.commands }
    };
  });
  return createQuirePageStackDisplayListChunkIndex(chunks);
}

/**
 * Finds a page-local display-list chunk by page index.
 *
 * @param index - Optional chunk index attached to an engine frame.
 * @param pageIndex - Zero-based page index to resolve.
 * @returns Matching page-local chunk, or undefined when absent.
 */
export function findQuirePageStackDisplayListChunk(
  index: QuirePageStackDisplayListChunkIndex | undefined,
  pageIndex: number
): QuirePageStackDisplayListChunk | undefined {
  return index?.chunksByPageIndex?.[pageIndex]
    ?? index?.chunks.find((chunk) => chunk.pageIndex === pageIndex);
}

/** @param page - Layout page that owns the record. @returns Retained page record. */
function createPageRecord(page: QuireLayoutPage): QuirePageStackDisplayListChunkRecord {
  return {
    key: `page:${page.pageIndex}`,
    kind: "page-local",
    pageIndex: page.pageIndex,
    pageRect: page.pageRect,
    rect: page.pageRect
  };
}

/** @param pages - Candidate pages. @param clips - Optional active clips. @returns Selected pages. */
function filterPages(
  pages: readonly QuireLayoutPage[],
  clips: readonly QuireRect[] | undefined
): readonly QuireLayoutPage[] {
  if (clips === undefined) return pages;
  if (clips.length === 0) return [];
  return pages.filter((page) => doesQuireRectIntersectAny(page.pageRect, clips));
}

/** @param rects - Page rectangles. @returns Mutable buckets matching input order. */
function createBuckets(rects: readonly QuireRect[]): QuirePageDisplayListBucketWriter[] {
  return rects.map((viewportRect) => ({ viewportRect, commands: [], dirtyBounds: null }));
}

/** @param command - Command to route. @param buckets - Candidate page buckets. */
function appendCommand(
  command: QuireDisplayCommand,
  buckets: readonly QuirePageDisplayListBucketWriter[]
): void {
  const matched = buckets.filter((bucket) =>
    readQuireDisplayChunkDisplayCommandDirtyBounds(command, bucket.viewportRect) !== null
  );
  if (matched.length === 0) return;
  if (command.kind !== "clip" || command.transform !== undefined) {
    for (const bucket of matched) {
      bucket.commands.push(command);
      addDirtyBounds(bucket, command);
    }
    return;
  }

  const children = createBuckets(matched.map((bucket) => bucket.viewportRect));
  for (const child of command.commands) {
    appendCommand(child, children);
  }
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    if (child.commands.length === 0) continue;
    const clipped = { ...command, commands: child.commands };
    matched[index]!.commands.push(clipped);
    addDirtyBounds(matched[index]!, clipped);
  }
}

/** @param bucket - Bucket receiving the command. @param command - Retained command. */
function addDirtyBounds(
  bucket: QuirePageDisplayListBucketWriter,
  command: QuireDisplayCommand
): void {
  const dirty = readQuireDisplayChunkDisplayCommandDirtyBounds(
    command,
    bucket.viewportRect
  );
  if (dirty !== null) {
    bucket.dirtyBounds = expandQuireDisplayChunkRectUnion(bucket.dirtyBounds, dirty);
  }
}
