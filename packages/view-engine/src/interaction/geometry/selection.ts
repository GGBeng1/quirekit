import {
  buildCaretGeometry,
  defaultCaretWidth
} from "../selection/caret";
import { buildRangeGeometries } from "../selection/ranges";
import type {
  QuireInteractionCaretAtPositionOptions,
  QuireInteractionCaretAtPositionResult,
  QuireInteractionSelectionRectsOptions,
  QuireInteractionSelectionRectsResult
} from "./types";

/**
 * Resolves collapsed caret geometry from the interaction geometry facade.
 *
 * @param options - Snapshot, document position, and optional caret width.
 * @returns Collapsed caret geometry with provenance, or null when unmapped.
 */
export function resolveQuireInteractionCaretAtPosition(
  options: QuireInteractionCaretAtPositionOptions
): QuireInteractionCaretAtPositionResult | null {
  const caret = buildCaretGeometry(
    options.snapshot.root.children ?? [],
    options.position,
    options.caretWidth ?? defaultCaretWidth,
    options.selectionContext
  );

  if (caret === null) {
    return null;
  }

  const snapshotVersion = options.snapshot.viewGraph?.version;

  return {
    position: caret.position,
    rect: caret.rect,
    source: "layout-caret",
    ...(caret.queryOwner === undefined ? {} : { queryOwner: caret.queryOwner }),
    ...(caret.queryOwner?.region === undefined
      ? {}
      : { viewRegion: caret.queryOwner.region }),
    ...(snapshotVersion === undefined ? {} : { snapshotVersion })
  };
}

/**
 * Resolves selection rectangles from the interaction geometry facade.
 *
 * @param options - Snapshot and document range to map.
 * @returns Selection rectangles with provenance.
 */
export function resolveQuireInteractionSelectionRects(
  options: QuireInteractionSelectionRectsOptions
): QuireInteractionSelectionRectsResult {
  const snapshotVersion = options.snapshot.viewGraph?.version;
  const ranges = buildRangeGeometries(
    options.snapshot.root.children ?? [],
    options.range,
    undefined,
    options.selectionContext
  );
  const queryOwner = ranges.find((range) => range.queryOwner !== undefined)
    ?.queryOwner;

  return {
    ranges,
    source: "layout-selection-rects",
    ...(queryOwner === undefined ? {} : { queryOwner }),
    ...(queryOwner?.region === undefined
      ? {}
      : { viewRegion: queryOwner.region }),
    ...(snapshotVersion === undefined ? {} : { snapshotVersion })
  };
}
