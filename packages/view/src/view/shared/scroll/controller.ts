import type { QuireScrollIntoViewOptions } from "@quirekit/core";
import type { QuireMountedEditorView } from "../types";
import { createMountedViewRevealer, uniteMountedViewScrollRects, type MountedViewRevealer, type MountedViewRevealRange } from "./reveal";
import { readMountedViewScrollCounter, scrollMountedViewToSelection } from "./scroll";
import type { MountedViewScrollRect } from "./types";

/** Geometry sources one mounted view lends its scroll controller. */
export interface MountedViewScrollControllerOptions {
  /** Retained client rectangle of the current selection, or null. */
  readonly resolveSelectionRect: () => MountedViewScrollRect | null;
  /** Client rectangle of one rendered position, or null. */
  readonly resolvePositionRect: (position: number) => MountedViewScrollRect | null;
  /** Client rectangle of the page holding a position, rendered or not, or null. */
  readonly resolvePageRect: (position: number) => MountedViewScrollRect | null;
  /** Subscribes to committed geometry revisions; returns the release function. */
  readonly onGeometryUpdate: (listener: () => void) => () => void;
}

/** Selection and range scrolling owned by one mounted view. */
export interface MountedViewScrollController {
  /**
   * Scrolls the selection into view; without rendered geometry the head's page scrolls first.
   * @param options - Alignment and margin; omitted keeps the PM default.
   * @returns Whether scrolling was handled or started.
   */
  scrollToSelection(options?: QuireScrollIntoViewOptions): boolean;
  /**
   * Scrolls a document range, clamped to the document, into view without changing the selection.
   * @param range - Document range to reveal.
   * @param options - Alignment and margin.
   * @returns Whether geometry for the range was found and scrolling started.
   */
  scrollRangeIntoView(range: MountedViewRevealRange, options: QuireScrollIntoViewOptions): boolean;
  /** Records the current PM scroll request counter as already handled. */
  acceptScrollRequests(): void;
  /** Scrolls to the selection when the PM scroll request counter advanced. */
  scrollToSelectionIfRequested(): void;
  /** Drops a pending range refinement. */
  cancel(): void;
}

/**
 * Creates the scroll controller of one mounted view; the revealer is created on first use.
 *
 * @param view - Mounted view whose ancestors scroll.
 * @param options - Geometry sources and render notifications.
 * @returns Scroll controller.
 */
export function createMountedViewScrollController(
  view: QuireMountedEditorView,
  options: MountedViewScrollControllerOptions
): MountedViewScrollController {
  let revealer: MountedViewRevealer | undefined;
  let handledRequests = 0;
  const reveal = (): MountedViewRevealer => revealer ??= createMountedViewRevealer(view, {
    resolveRangeRect: range => uniteMountedViewScrollRects(
      options.resolvePositionRect(range.from),
      range.to === range.from ? null : options.resolvePositionRect(range.to)
    ),
    resolvePageRect: options.resolvePageRect,
    onGeometryUpdate: options.onGeometryUpdate
  });
  return {
    scrollToSelection(scroll) {
      // A range being revealed owns scrolling until its page renders and it aligns.
      if (revealer?.pending === true) return true;
      if (scrollMountedViewToSelection(view, options.resolveSelectionRect, options.resolvePositionRect, scroll)) return true;
      const selection = view.state.selection as { readonly head?: number; readonly from: number };
      const head = selection.head ?? selection.from;
      return reveal().reveal({ from: head, to: head }, scroll ?? {}, false);
    },
    scrollRangeIntoView(range, scroll) {
      const size = view.state.doc.content.size;
      const from = Math.max(0, Math.min(range.from, size));
      return reveal().reveal({ from, to: Math.max(from, Math.min(range.to, size)) }, scroll);
    },
    acceptScrollRequests() {
      handledRequests = readMountedViewScrollCounter(view.state);
    },
    scrollToSelectionIfRequested() {
      const requests = readMountedViewScrollCounter(view.state);
      const requested = requests > handledRequests;
      handledRequests = requests;
      // The public method stays observable and overridable by mounted views.
      if (requested) view.scrollToSelection();
    },
    cancel: () => revealer?.cancel()
  };
}
