import {
  createAncestorScrollSource,
  createEditorViewportScrollSource,
  findScrollableAncestor,
  type AncestorScroller,
  type ScrollSource
} from "../shared";
import type { CanvasMountedViewRuntimeOptions } from "./types";

/** Options for {@link resolveCanvasMountedScrollSource}. */
export interface ResolveCanvasMountedScrollSourceOptions {
  /** Mounted view root, used as the document content and ancestor anchor. */
  readonly root: HTMLElement;
  /** Runtime options carrying the scroll-source model and overrides. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}

/**
 * Resolves the scroll source for a mounted canvas view from runtime config.
 *
 * The design default is the editor-owned inner viewport, but that needs a
 * configured `overflow: auto` element. When none is supplied (the current
 * embedder scrolls the editor externally), this falls back to an ancestor scroll
 * source observing the nearest scrollable ancestor, or the window, so external
 * scrolling keeps working without reworking the embedder.
 *
 * @param options - Mounted root and runtime configuration.
 * @returns Scroll source for the active scroll model.
 */
export function resolveCanvasMountedScrollSource(
  options: ResolveCanvasMountedScrollSourceOptions
): ScrollSource {
  const { root, runtime } = options;
  const model = runtime?.scrollSource ?? "viewport";
  const viewport = runtime?.scrollViewport;

  if (model === "viewport" && viewport) {
    return viewport === root
      ? createEditorViewportScrollSource({ viewport })
      : createAncestorScrollSource({ scroller: viewport, content: root });
  }

  const scroller: AncestorScroller =
    runtime?.scroller ?? findScrollableAncestor(root) ?? root.ownerDocument.defaultView ?? root;

  return createAncestorScrollSource({ scroller, content: root });
}
