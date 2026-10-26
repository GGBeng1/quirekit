import type { DrawingAnchor } from "@quirekit/drawing-geometry";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireDrawingFrame,
  QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";
import type {
  MountedDrawingAnchorRelocation,
  MountedDrawingManipulationPreviewState
} from "../types";
import { resolveMountedNearestCaret } from "../../input-anchor";
import { findNearestBodyCaretPoint } from "./body-caret";
import {
  clampPointToRect,
  findNearestPage,
  findProjectedTextblockRect,
  leadingCorner,
  resolveBlockReferenceRect,
  resolveInlineReferenceRect
} from "./geometry";

/** Result of resolving target-page ownership for one manipulation frame. */
export type MountedDrawingReanchorResolution =
  | {
      /** The final frame remains on the accepted source page. */
      readonly kind: "same-page";
    }
  | {
      /** The final frame belongs to another page and has exact source facts. */
      readonly kind: "reanchor";
      /** Source insertion and reference geometry shared by preview and commit. */
      readonly relocation: MountedDrawingAnchorRelocation;
    }
  | {
      /** The frame crossed pages but exact body ownership could not be proven. */
      readonly kind: "rejected";
    };

/** Input authority for one cross-page source-owner resolution. */
export interface ResolveMountedDrawingReanchorOptions {
  /** Accepted retained layout snapshot captured by mounted interaction. */
  readonly snapshot: QuireRetainedLayoutSnapshot;
  /** Current immutable ProseMirror document. */
  readonly doc: ProseMirrorNode;
  /** Revalidated Word source placement intent. */
  readonly attrs: DrawingAnchor;
  /** Manipulation family being resolved. */
  readonly operation: "move" | "resize" | "rotate" | "control";
  /** Accepted frame when pointer capture began. */
  readonly startFrame: QuireDrawingFrame;
  /** Latest or final controller frame. */
  readonly frame: QuireDrawingFrame;
}

/**
 * Resolves whether a manipulation must move its inline source anchor to another page.
 *
 * Page geometry stays derived. Only a move may change source ownership; resize
 * and rotate continue to use the accepted paragraph even when their visual
 * bounds overlap another page.
 *
 * @param options - Accepted snapshot, source intent, operation, and frames.
 * @returns Same-page, exact relocation, or rejected cross-page resolution.
 */
export function resolveMountedDrawingReanchor(
  options: ResolveMountedDrawingReanchorOptions
): MountedDrawingReanchorResolution {
  const pages = options.snapshot.pages;
  if (options.operation !== "move" || pages === undefined || pages.length < 2) {
    return { kind: "same-page" };
  }

  const sourcePage = findNearestPage(pages, leadingCorner(options.startFrame.rect));
  const targetPage = findNearestPage(pages, leadingCorner(options.frame.rect));
  if (sourcePage === undefined || targetPage === undefined) {
    return { kind: "same-page" };
  }
  if (sourcePage.pageIndex === targetPage.pageIndex) {
    return { kind: "same-page" };
  }
  if (
    options.attrs.horizontalPosition.kind !== "offset"
    || options.attrs.verticalPosition.kind !== "offset"
  ) {
    return { kind: "rejected" };
  }

  // Phase 1: page gaps are not source surfaces. Clamp the requested leading
  // corner into the nearest page body before querying retained caret geometry.
  const targetPoint = clampPointToRect(
    leadingCorner(options.frame.rect),
    targetPage.bodyRect
  );
  const bodyCaretPoint = findNearestBodyCaretPoint(
    options.snapshot.root,
    targetPoint,
    targetPage
  );
  if (bodyCaretPoint === undefined) {
    return { kind: "rejected" };
  }
  const caret = resolveMountedNearestCaret(options.snapshot, bodyCaretPoint);
  const caretRegion = caret.kind === "caret"
    ? caret.queryOwner?.region ?? caret.viewRegion
    : undefined;
  if (
    caret.kind !== "caret"
    || caret.position.pos < targetPage.range.from
    || caret.position.pos > targetPage.range.to
    || caretRegion?.kind !== "body"
  ) {
    return { kind: "rejected" };
  }

  // Phase 2: prove the target belongs to an inline-capable body textblock, then
  // recover the exact projected paragraph reference used by placement layout.
  const resolved = options.doc.resolve(caret.position.pos);
  if (!resolved.parent.inlineContent) {
    return { kind: "rejected" };
  }
  const paragraphStart = resolved.depth === 0 ? 0 : resolved.before(resolved.depth);
  const paragraphRect = findProjectedTextblockRect(
    options.snapshot.root,
    paragraphStart,
    targetPage.pageRect
  );
  if (paragraphRect === undefined) {
    return { kind: "rejected" };
  }

  const inlineReferenceRect = resolveInlineReferenceRect(
    options.attrs,
    caret.rect,
    targetPage
  );
  const blockReferenceRect = resolveBlockReferenceRect(
    options.attrs,
    caret.rect,
    paragraphRect,
    targetPage
  );
  const frame = {
    ...options.frame,
    rect: {
      ...options.frame.rect,
      x: targetPoint.x,
      y: targetPoint.y
    }
  };

  return {
    kind: "reanchor",
    relocation: {
      targetPosition: caret.position.pos,
      targetPageIndex: targetPage.pageIndex,
      frame,
      inlineReferenceRect,
      blockReferenceRect
    }
  };
}

/**
 * Projects an exact relocation onto the transient controller state.
 *
 * @param state - Active pure-controller manipulation state.
 * @param relocation - Target-page ownership and clamped final frame.
 * @returns Preview state whose controls and speculative layout share geometry.
 */
export function applyMountedDrawingRelocationToPreview(
  state: MountedDrawingManipulationPreviewState,
  relocation: MountedDrawingAnchorRelocation
): MountedDrawingManipulationPreviewState {
  return {
    ...state,
    track: {
      ...state.track,
      previewFrame: relocation.frame
    },
    relocation
  };
}
