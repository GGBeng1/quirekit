import type { QuireScrollIntoViewOptions } from "@quirekit/core";
import type { QuireMountedEditorView } from "../types";
import { scrollMountedViewRectIntoAncestorChain } from "./rect";
import type { MountedViewScrollRect } from "./types";

/** Geometry follow-ups tried after a coarse scroll before giving up. */
const maximumRefinements = 3;

/** Geometry sources and render notifications a revealer needs from its view. */
export interface MountedViewRevealOptions {
  /** Precise client rectangle of a range on a rendered page, or null. */
  readonly resolveRangeRect: (range: MountedViewRevealRange) => MountedViewScrollRect | null;
  /** Client rectangle of the page holding a position, rendered or not, or null. */
  readonly resolvePageRect: (position: number) => MountedViewScrollRect | null;
  /** Subscribes to committed geometry revisions; returns the release function. */
  readonly onGeometryUpdate: (listener: () => void) => () => void;
}

/** Document range to reveal. */
export interface MountedViewRevealRange {
  /** Range start. */
  readonly from: number;
  /** Range end. */
  readonly to: number;
}

/** Reveals document ranges in one mounted view. */
export interface MountedViewRevealer {
  /**
   * Scrolls a range into view, coarsely first when its page is not rendered.
   * @param range - Document range.
   * @param options - Alignment and margin.
   * @param tryPrecise - False when the caller already found no precise geometry, so only the page is tried now.
   * @returns Whether geometry was found and scrolling started.
   */
  reveal(range: MountedViewRevealRange, options: QuireScrollIntoViewOptions, tryPrecise?: boolean): boolean;
  /** Drops a pending refinement. */
  cancel(): void;
  /** Whether a coarse scroll is waiting for precise geometry of the current document. */
  readonly pending: boolean;
}

/**
 * Creates the range revealer of one mounted view.
 *
 * A range on a rendered page scrolls once with its precise rectangle. Otherwise the
 * layout's page rectangle brings the page into view, which renders it; the next
 * committed geometry revision then aligns the precise rectangle with the same
 * options. A newer request, a document change or repeated missing geometry ends
 * the refinement.
 *
 * @param view - Mounted view whose ancestors scroll.
 * @param options - Geometry sources and render notifications.
 * @returns Revealer.
 */
export function createMountedViewRevealer(view: QuireMountedEditorView, options: MountedViewRevealOptions): MountedViewRevealer {
  let release: (() => void) | null = null;
  let pendingDoc: unknown = null;
  const cancel = () => {
    release?.();
    release = null;
  };
  return {
    reveal(range, scroll, tryPrecise = true) {
      cancel();
      const precise = tryPrecise ? options.resolveRangeRect(range) : null;
      if (precise !== null) {
        scrollMountedViewRectIntoAncestorChain(view, precise, scroll);
        return true;
      }
      const page = options.resolvePageRect(range.from);
      if (page === null) return false;
      scrollMountedViewRectIntoAncestorChain(view, page, scroll.block === "center" || scroll.block === "end" ? scroll : { ...scroll, block: "start" });
      const doc = view.state.doc;
      pendingDoc = doc;
      let attempts = 0;
      release = options.onGeometryUpdate(() => {
        attempts += 1;
        const rect = view.state.doc === doc ? options.resolveRangeRect(range) : null;
        if (rect !== null) scrollMountedViewRectIntoAncestorChain(view, rect, scroll);
        if (rect !== null || view.state.doc !== doc || attempts >= maximumRefinements) cancel();
      });
      return true;
    },
    cancel,
    get pending() {
      return release !== null && view.state.doc === pendingDoc;
    }
  };
}

/**
 * Unites the caret rectangles at both ends of a range.
 * @param start - Rectangle at the range start, or null.
 * @param end - Rectangle at the range end, or null.
 * @returns Covering rectangle, the start alone when the end is unknown, or null.
 */
export function uniteMountedViewScrollRects(start: MountedViewScrollRect | null, end: MountedViewScrollRect | null): MountedViewScrollRect | null {
  if (start === null) return null;
  if (end === null) return start;
  return {
    left: Math.min(start.left, end.left), right: Math.max(start.right, end.right),
    top: Math.min(start.top, end.top), bottom: Math.max(start.bottom, end.bottom)
  };
}
