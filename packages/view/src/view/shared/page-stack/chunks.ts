import type { QuireDisplayList } from "@quirekit/renderer";
import {
  createQuirePageStackDisplayListsForRects,
  createQuirePageStackDisplayListChunkIndex,
  readQuireDisplayChunkDisplayListDirtyBounds
} from "@quirekit/view-engine";
import { replaceMountedSelectionOverlayCommands } from "../selection-overlay";
import type {
  QuirePageStackDisplayListChunkIndex
} from "./types";

/**
 * Rebuilds overlay display-list chunks while preserving retained content chunks.
 *
 * Overlay-only selection/caret patches can replace the transient overlay list
 * without rebuilding document content. This helper keeps content chunks and
 * page identity stable while refreshing overlay commands and dirty bounds for
 * the same retained page set.
 *
 * @param index - Existing page-local chunk index to update.
 * @param overlayDisplayList - New document-space overlay display list.
 * @param replacedCommandIds - Runtime-activated command ids replaced in this pass.
 * @returns Updated chunk index, or undefined when no chunks were retained.
 */
export function refreshQuirePageStackOverlayDisplayListChunks(
  index: QuirePageStackDisplayListChunkIndex | undefined,
  overlayDisplayList: QuireDisplayList,
  replacedCommandIds: ReadonlySet<string> = new Set()
): QuirePageStackDisplayListChunkIndex | undefined {
  if (index === undefined) {
    return undefined;
  }

  const overlayDisplayLists = createQuirePageStackDisplayListsForRects(
    overlayDisplayList,
    index.chunks.map((chunk) => chunk.pageRect)
  );

  return createQuirePageStackDisplayListChunkIndex(
    index.chunks.map((chunk, index) => {
      const selectionOverlayDisplayList = overlayDisplayLists[index]!;
      const refreshedOverlayDisplayList = {
        ...selectionOverlayDisplayList,
        commands: replaceMountedSelectionOverlayCommands(
          chunk.overlayDisplayList.commands,
          selectionOverlayDisplayList.commands,
          replacedCommandIds
        )
      };

      return {
        ...chunk,
        overlayDirtyBounds: readQuireDisplayChunkDisplayListDirtyBounds(
          refreshedOverlayDisplayList,
          chunk.pageRect
        ),
        overlayDisplayList: refreshedOverlayDisplayList
      };
    })
  );
}

/**
 * Replaces an exact transient overlay command family across retained page chunks.
 *
 * Unlike selection refresh, this helper does not classify caret or range commands.
 * It is intended for gesture previews whose command ids are explicitly owned by
 * the caller while the accepted interaction targets remain stable.
 *
 * @param index - Existing page-local chunk index to update.
 * @param overlayDisplayList - Replacement commands in document coordinates.
 * @param replacedCommandIds - Exact accepted and previous-preview ids to remove.
 * @returns Updated chunk index, or undefined when no chunks were retained.
 */
export function refreshQuirePageStackExactOverlayCommands(
  index: QuirePageStackDisplayListChunkIndex | undefined,
  overlayDisplayList: QuireDisplayList,
  replacedCommandIds: ReadonlySet<string>
): QuirePageStackDisplayListChunkIndex | undefined {
  if (index === undefined) {
    return undefined;
  }

  const replacementDisplayLists = createQuirePageStackDisplayListsForRects(
    overlayDisplayList,
    index.chunks.map((chunk) => chunk.pageRect)
  );

  return createQuirePageStackDisplayListChunkIndex(
    index.chunks.map((chunk, chunkIndex) => {
      const replacement = replacementDisplayLists[chunkIndex]!;
      const refreshedOverlayDisplayList = {
        ...replacement,
        commands: replaceExactCommands(
          chunk.overlayDisplayList.commands,
          replacement.commands,
          replacedCommandIds
        )
      };

      return {
        ...chunk,
        overlayDirtyBounds: readQuireDisplayChunkDisplayListDirtyBounds(
          refreshedOverlayDisplayList,
          chunk.pageRect
        ),
        overlayDisplayList: refreshedOverlayDisplayList
      };
    })
  );
}

/**
 * Replaces an exact transient content command family across retained page chunks.
 *
 * @param index - Existing page-local chunk index to update.
 * @param contentDisplayList - Replacement commands in document coordinates.
 * @param replacedCommandIds - Exact accepted command ids to remove.
 * @returns Updated chunk index, or undefined when no chunks were retained.
 */
export function refreshQuirePageStackExactContentCommands(
  index: QuirePageStackDisplayListChunkIndex | undefined,
  contentDisplayList: QuireDisplayList,
  replacedCommandIds: ReadonlySet<string>
): QuirePageStackDisplayListChunkIndex | undefined {
  if (index === undefined) {
    return undefined;
  }

  const replacementDisplayLists = createQuirePageStackDisplayListsForRects(
    contentDisplayList,
    index.chunks.map((chunk) => chunk.pageRect)
  );

  return createQuirePageStackDisplayListChunkIndex(
    index.chunks.map((chunk, chunkIndex) => {
      const replacement = replacementDisplayLists[chunkIndex]!;
      const refreshedContentDisplayList = {
        ...replacement,
        commands: replaceExactCommands(
          chunk.contentDisplayList.commands,
          replacement.commands,
          replacedCommandIds
        )
      };

      return {
        ...chunk,
        contentDirtyBounds: readQuireDisplayChunkDisplayListDirtyBounds(
          refreshedContentDisplayList,
          chunk.pageRect
        ),
        contentDisplayList: refreshedContentDisplayList
      };
    })
  );
}

/**
 * Replaces exact command ids while retaining the surrounding paint order.
 *
 * @param previousCommands - Current overlay commands.
 * @param replacementCommands - New transient commands.
 * @param replacedCommandIds - Exact command ids removed before insertion.
 * @returns Commands with the replacement inserted at the first removed slot.
 */
function replaceExactCommands(
  previousCommands: QuireDisplayList["commands"],
  replacementCommands: QuireDisplayList["commands"],
  replacedCommandIds: ReadonlySet<string>
): QuireDisplayList["commands"] {
  const firstReplacementIndex = previousCommands.findIndex((command) =>
    replacedCommandIds.has(command.id)
  );
  const persistentCommands = previousCommands.filter((command) =>
    !replacedCommandIds.has(command.id)
  );
  const insertionIndex = firstReplacementIndex < 0
    ? persistentCommands.length
    : previousCommands
      .slice(0, firstReplacementIndex)
      .filter((command) => !replacedCommandIds.has(command.id))
      .length;

  return [
    ...persistentCommands.slice(0, insertionIndex),
    ...replacementCommands,
    ...persistentCommands.slice(insertionIndex)
  ];
}
