import type { QuireCommandRoutingScope } from "@quirekit/view-engine";
import type { QuireLayoutRegionKind } from "@quirekit/layout/identity";
import { Selection, type Node as ProseMirrorNode, type ResolvedPos } from "@quirekit/pm";
import type {
  QuireStoryCommandBoundary,
  QuireStoryCommandBoundaryRegionKind
} from "./types";

/**
 * Resolves the live header/footer command boundary for mounted input.
 *
 * @param scope - Active retained command scope.
 * @param doc - Current ProseMirror document.
 * @returns Live story boundary, or null for body and incomplete owners.
 */
export function resolveQuireStoryCommandBoundary(
  scope: QuireCommandRoutingScope,
  doc: ProseMirrorNode
): QuireStoryCommandBoundary | null {
  const directRegionKind = readStoryBoundaryRegionKind(scope.activeRegion?.kind);
  const interactionScope = scope.interactionTarget?.interactionScope;
  const scopedRegionKind = readStoryBoundaryRegionKind(
    interactionScope?.region.kind
  );
  const regionKind = directRegionKind ?? scopedRegionKind;
  const source = directRegionKind === null
    ? interactionScope?.source
    : scope.activeSource;

  if (
    regionKind === null ||
    source?.range === undefined ||
    source.range.from < 0 ||
    source.range.from >= source.range.to ||
    source.range.to > doc.content.size
  ) {
    return null;
  }

  const liveRange = resolveLiveStoryStructuralRange(
    scope.selection.$head,
    source.range.from,
    source.range.to
  );
  const startSelection = Selection.near(doc.resolve(liveRange.from), 1);
  const endSelection = Selection.near(doc.resolve(liveRange.to), -1);
  const selectionFrom = Math.max(liveRange.from, startSelection.from);
  const selectionTo = Math.min(liveRange.to, endSelection.to);

  if (selectionFrom > selectionTo) {
    return null;
  }

  return {
    sourceId: source.sourceId,
    regionKind,
    from: liveRange.from,
    to: liveRange.to,
    selectionFrom,
    selectionTo
  };
}

/**
 * Clamps a document position to selectable story content.
 *
 * @param boundary - Active story command boundary.
 * @param position - Requested document position.
 * @returns Position constrained to the story selection endpoints.
 */
export function clampQuireStoryCommandPosition(
  boundary: QuireStoryCommandBoundary,
  position: number
): number {
  return Math.min(
    Math.max(position, boundary.selectionFrom),
    boundary.selectionTo
  );
}

/**
 * Checks whether both sides of a selection remain inside an active story.
 *
 * @param boundary - Active story command boundary.
 * @param anchor - Fixed selection side.
 * @param head - Moving selection side.
 * @returns Whether the selection is story-scoped.
 */
export function isQuireSelectionInsideStoryCommandBoundary(
  boundary: QuireStoryCommandBoundary,
  anchor: number,
  head: number
): boolean {
  return anchor >= boundary.selectionFrom &&
    anchor <= boundary.selectionTo &&
    head >= boundary.selectionFrom &&
    head <= boundary.selectionTo;
}

/**
 * Reads a supported auxiliary-story region kind.
 *
 * @param kind - Retained region kind from command routing.
 * @returns Supported auxiliary-story kind, or null outside the current slice.
 */
function readStoryBoundaryRegionKind(
  kind: QuireLayoutRegionKind | undefined
): QuireStoryCommandBoundaryRegionKind | null {
  return kind === "header" || kind === "footer" || kind === "drawing-text" || kind === "footnote" || kind === "endnote"
    ? kind
    : null;
}

/**
 * Refreshes a snapshot source range from the live selection container.
 *
 * The story content start is stable for edits inside that story. Matching an
 * ancestor start therefore updates the range end after consecutive inserts or
 * deletes without importing Word schema identifiers into the mounted View.
 *
 * @param $head - Live selection head.
 * @param sourceFrom - Snapshot story content start.
 * @param sourceTo - Snapshot story content end fallback.
 * @returns Live structural range for the active story.
 */
function resolveLiveStoryStructuralRange(
  $head: ResolvedPos,
  sourceFrom: number,
  sourceTo: number
): { readonly from: number; readonly to: number } {
  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if ($head.start(depth) === sourceFrom) {
      return { from: sourceFrom, to: $head.end(depth) };
    }
  }

  return { from: sourceFrom, to: sourceTo };
}
