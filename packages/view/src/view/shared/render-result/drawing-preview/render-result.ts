import type { QuireDisplayList } from "@quirekit/renderer";
import {
  refreshQuirePageStackExactContentCommands,
  refreshQuirePageStackExactOverlayCommands
} from "../../page-stack";
import type { QuireViewRenderResult } from "../../../types";
import { resolveMountedDrawingPreviewCommands } from "./commands";
import { resolveMountedDrawingContentPreviewCommands } from "./content";
import { replaceMountedDrawingPreviewCommands } from "./replace";
import type { CreateMountedDrawingPreviewRenderResultOptions } from "./types";
import { createMountedDrawingCreationPreviewRenderResult } from "./creation";

/**
 * Projects transient drawing content and chrome without changing layout or targets.
 *
 * @param options - Previous result, active identity, and preview visibility.
 * @returns Transient render result, or the previous result when ownership is stale.
 */
export function createMountedDrawingPreviewRenderResult(
  options: CreateMountedDrawingPreviewRenderResultOptions
): QuireViewRenderResult {
  if (options.state.kind === "creating") {
    return createMountedDrawingCreationPreviewRenderResult(options);
  }
  const previous = options.previousRenderResult;
  const overlayProjection = resolveMountedDrawingPreviewCommands(options);
  const contentProjection = resolveMountedDrawingContentPreviewCommands(options);
  if (overlayProjection === undefined || contentProjection === undefined) {
    return previous;
  }
  const overlayReplacementDisplayList: QuireDisplayList = {
    bounds: previous.layoutSnapshot.documentRect,
    commands: overlayProjection.replacementCommands
  };
  const contentReplacementDisplayList: QuireDisplayList = {
    bounds: previous.layoutSnapshot.documentRect,
    commands: contentProjection.replacementCommands
  };
  const pageChunksOwnCommands = previous.pageDisplayListChunks !== undefined
    && previous.displayList.commands.length === 0;

  // Page-stack and composite surfaces consume the same exact command family.
  // The accepted target index stays unchanged for the captured pointer.
  if (pageChunksOwnCommands) {
    const contentChunks = refreshQuirePageStackExactContentCommands(
      previous.pageDisplayListChunks,
      contentReplacementDisplayList,
      contentProjection.replacedCommandIds
    );
    return {
      ...previous,
      pageDisplayListChunks: refreshQuirePageStackExactOverlayCommands(
        contentChunks,
        overlayReplacementDisplayList,
        overlayProjection.replacedCommandIds
      )
    };
  }

  const contentDisplayList = {
    ...previous.contentDisplayList,
    commands: replaceMountedDrawingPreviewCommands(
      previous.contentDisplayList.commands,
      contentProjection.replacementCommands,
      contentProjection.replacedCommandIds
    )
  };
  const overlayDisplayList = {
    ...previous.overlayDisplayList,
    commands: replaceMountedDrawingPreviewCommands(
      previous.overlayDisplayList.commands,
      overlayProjection.replacementCommands,
      overlayProjection.replacedCommandIds
    )
  };
  return {
    ...previous,
    contentDisplayList,
    overlayDisplayList,
    displayList: {
      ...previous.displayList,
      commands: [
        ...contentDisplayList.commands,
        ...overlayDisplayList.commands
      ]
    }
  };
}
