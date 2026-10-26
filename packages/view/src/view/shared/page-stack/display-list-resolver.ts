import type { QuireDisplayList } from "@quirekit/renderer";
import { findQuirePageStackDisplayListChunk } from "@quirekit/view-engine";
import type {
  QuirePageStackDisplayListSource,
  ResolveQuirePageStackDisplayListSourceForFrameOptions,
  ResolveQuirePageStackDisplayListsForFramesOptions
} from "./types";

/**
 * Resolves the best display-list source for a page-stack frame and layer.
 *
 * Retained page-local chunks are authoritative. A missing chunk means the
 * mounted page set has moved outside the retained render-result scope and the
 * caller must refresh the page-stack render result before painting.
 *
 * @param options - Frame, retained chunks, and layer.
 * @returns Display-list source plus whether it is already viewport-scoped.
 */
export function resolveQuirePageStackDisplayListSourceForFrame(
  options: ResolveQuirePageStackDisplayListSourceForFrameOptions
): QuirePageStackDisplayListSource {
  const chunk = findQuirePageStackDisplayListChunk(
    options.pageDisplayListChunks,
    options.frame.pageIndex
  );
  if (chunk === undefined) {
    throw new RangeError(
      `Missing page-stack display-list chunk for page ${options.frame.pageIndex}`
    );
  }

  const chunkDisplayList = options.layer === "content"
    ? chunk.contentDisplayList
    : chunk.overlayDisplayList;

  return {
    chunkKey: chunk.retainedRecord.key,
    sourceOwnerKeys: chunk.sourceOwnerKeys,
    displayList: chunkDisplayList,
    displayListIsViewportScoped: true
  };
}

/**
 * Resolves page-scoped display lists for mounted page-stack frames.
 *
 * Retained chunks are authoritative for every requested frame.
 *
 * @param options - Frames, retained chunks, and layer.
 * @returns Display lists matching frame order.
 */
export function resolveQuirePageStackDisplayListsForFrames(
  options: ResolveQuirePageStackDisplayListsForFramesOptions
): readonly QuireDisplayList[] {
  return options.frames.map((frame) =>
    resolveQuirePageStackDisplayListSourceForFrame({
      frame,
      pageDisplayListChunks: options.pageDisplayListChunks,
      layer: options.layer
    }).displayList
  );
}
