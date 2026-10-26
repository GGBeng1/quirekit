import type { QuireScrollIntoViewOptions } from "@quirekit/core";
import { scrollMountedViewRectIntoAncestorChain } from "./rect";
import type { QuireMountedEditorView } from "../types";
import type {
  MountedViewPositionScrollRectResolver,
  MountedViewScrollRect,
  MountedViewSelectionScrollRectResolver
} from "./types";

/**
 * Reads the PM state scroll counter used by transactions with `scrollIntoView()`.
 *
 * @param state - ProseMirror editor state.
 * @returns Scroll-to-selection counter value.
 */
export function readMountedViewScrollCounter(state: unknown): number {
  const counter = (state as { readonly scrollToSelection?: unknown }).scrollToSelection;

  return typeof counter === "number" ? counter : 0;
}

/**
 * Scrolls a mounted view selection into view using PM-style hooks first.
 *
 * @param view - Mounted view whose selection should become visible.
 * @param resolveSelectionRect - Optional retained geometry resolver supplied by the mounted view.
 * @param resolvePositionRect - Optional position-anchor geometry resolver supplied by the mounted view.
 * @param options - Alignment and margin; PM `handleScrollToSelection` hooks run only for the default request.
 * @returns Whether a hook handled the request or the default scroller ran.
 */
export function scrollMountedViewToSelection(
  view: QuireMountedEditorView,
  resolveSelectionRect?: MountedViewSelectionScrollRectResolver | undefined,
  resolvePositionRect?: MountedViewPositionScrollRectResolver | undefined,
  options?: QuireScrollIntoViewOptions | undefined
): boolean {
  const handled = options === undefined &&
    view.someProp("handleScrollToSelection", (handler) =>
      typeof handler === "function" &&
      (handler as (view: QuireMountedEditorView) => boolean | void)(view) === true
    ) === true;

  if (handled) {
    return true;
  }

  return scrollMountedViewSelectionRect(
    view,
    resolveSelectionRect,
    resolvePositionRect,
    options
  );
}

/**
 * Runs the default mounted-view scroll behavior.
 *
 * @param view - Mounted view whose selection rectangle should be revealed.
 * @param resolveSelectionRect - Optional retained geometry resolver supplied by the mounted view.
 * @param resolvePositionRect - Optional position-anchor geometry resolver supplied by the mounted view.
 * @param options - Alignment and margin.
 * @returns Whether a selection rectangle was available.
 */
function scrollMountedViewSelectionRect(
  view: QuireMountedEditorView,
  resolveSelectionRect?: MountedViewSelectionScrollRectResolver | undefined,
  resolvePositionRect?: MountedViewPositionScrollRectResolver | undefined,
  options?: QuireScrollIntoViewOptions | undefined
): boolean {
  const retainedRect = resolveSelectionRect?.() ?? null;
  const rect =
    retainedRect ??
    resolveMountedViewPositionSelectionRect(view, resolvePositionRect);

  if (rect === null) {
    return false;
  }

  scrollMountedViewRectIntoAncestorChain(view, rect, options);

  return true;
}

/**
 * Resolves the default PM-style scroll rectangle through the canonical position anchor.
 *
 * @param view - Mounted view whose selection rectangle should be revealed.
 * @param resolvePositionRect - Optional position-anchor geometry resolver supplied by the mounted view.
 * @returns Viewport rectangle for the selection head, or null when unavailable.
 */
function resolveMountedViewPositionSelectionRect(
  view: QuireMountedEditorView,
  resolvePositionRect?: MountedViewPositionScrollRectResolver | undefined
): MountedViewScrollRect | null {
  if (resolvePositionRect === undefined) {
    return null;
  }

  const selection = view.state.selection as {
    readonly head?: number;
    readonly from: number;
  };
  const position = selection.head ?? selection.from;

  return resolvePositionRect(position);
}
