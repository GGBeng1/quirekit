import type {
  QuireDocumentRange,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireSelectionGeometryContext } from "../types";
import { resolveQuireInteractionHitTargetAtPoint } from "./hit-target";
import { resolveQuireInteractionInputAnchor } from "./input-anchor";
import { resolveQuireInteractionNearestCaretAtPoint } from "./nearest-caret";
import { resolveQuireInteractionPositionAtPoint } from "./position";
import { resolveQuireInteractionRectAtPosition } from "./rect-at-position";
import {
  resolveQuireInteractionCaretAtPosition,
  resolveQuireInteractionSelectionRects
} from "./selection";
import type {
  QuireInteractionCaretAtPositionResult,
  QuireInteractionGeometryAuthority,
  QuireInteractionGeometryAuthorityOptions,
  QuireInteractionHitTargetAtPointResult,
  QuireInteractionInputAnchorResult,
  QuireInteractionInputAnchorRole,
  QuireInteractionNearestCaretAtPointResult,
  QuireInteractionPositionAtPointResult,
  QuireInteractionRectAtPositionResult,
  QuireInteractionSelectionRectsResult
} from "./types";

/** Snapshot-backed implementation of the interaction geometry authority. */
class SnapshotBackedQuireInteractionGeometryAuthority
implements QuireInteractionGeometryAuthority {
  private readonly snapshot: QuireLayoutSnapshot;

  /**
   * Creates a geometry authority bound to one layout snapshot.
   *
   * @param snapshot - Layout snapshot that owns retained geometry products.
   */
  constructor(snapshot: QuireLayoutSnapshot) {
    this.snapshot = snapshot;
  }

  /**
   * Resolves a raw interaction target from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Hit-target result for the point.
   */
  hitTargetAt(point: QuirePoint): QuireInteractionHitTargetAtPointResult {
    return resolveQuireInteractionHitTargetAtPoint({
      snapshot: this.snapshot,
      point
    });
  }

  /**
   * Resolves a document position from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Position result for the point.
   */
  posAtCoords(point: QuirePoint): QuireInteractionPositionAtPointResult {
    return resolveQuireInteractionPositionAtPoint({
      snapshot: this.snapshot,
      point
    });
  }

  /**
   * Resolves the nearest caret from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Nearest-caret result for the point.
   */
  nearestCaret(point: QuirePoint): QuireInteractionNearestCaretAtPointResult {
    return resolveQuireInteractionNearestCaretAtPoint({
      snapshot: this.snapshot,
      point
    });
  }

  /**
   * Resolves a visual rectangle for a document position.
   *
   * @param position - Document position to query.
   * @param side - Optional side preference when a position sits between visual boxes.
   * @param selectionContext - Optional retained context for repeated visual instances.
   * @returns Rectangle query result with provenance.
   */
  coordsAtPos(
    position: number,
    side?: number,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionRectAtPositionResult {
    return resolveQuireInteractionRectAtPosition({
      snapshot: this.snapshot,
      position,
      ...(side === undefined ? {} : { side }),
      ...(selectionContext === undefined ? {} : { selectionContext })
    });
  }

  /**
   * Resolves collapsed caret geometry for a document position.
   *
   * @param position - Collapsed document position to query.
   * @param caretWidth - Optional caret width for the returned rectangle.
   * @param selectionContext - Optional retained context for repeated visual instances.
   * @returns Collapsed caret result, or null when no caret can be mapped.
   */
  caretAtPosition(
    position: number,
    caretWidth?: number,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionCaretAtPositionResult | null {
    return resolveQuireInteractionCaretAtPosition({
      snapshot: this.snapshot,
      position,
      ...(caretWidth === undefined ? {} : { caretWidth }),
      ...(selectionContext === undefined ? {} : { selectionContext })
    });
  }

  /**
   * Resolves selection rectangles from retained interaction geometry.
   *
   * @param range - Document range to map.
   * @returns Selection rectangles with provenance.
   */
  selectionRects(
    range: QuireDocumentRange,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionSelectionRectsResult {
    return resolveQuireInteractionSelectionRects({
      snapshot: this.snapshot,
      range,
      ...(selectionContext === undefined ? {} : { selectionContext })
    });
  }

  /**
   * Resolves an input anchor from retained interaction geometry.
   *
   * @param position - Document position that should own the input anchor.
   * @param role - Preferred anchor role for the active input state.
   * @param referenceRect - Optional visible geometry used to disambiguate repeated retained anchors.
   * @returns Retained input anchor result, or null when none matches.
   */
  inputAnchor(
    position: number,
    role: QuireInteractionInputAnchorRole,
    referenceRect?: QuireRect
  ): QuireInteractionInputAnchorResult | null {
    return resolveQuireInteractionInputAnchor({
      snapshot: this.snapshot,
      position,
      role,
      ...(referenceRect === undefined ? {} : { referenceRect })
    });
  }
}

/**
 * Creates the snapshot-backed interaction geometry authority.
 *
 * @param options - Layout snapshot used by all geometry queries.
 * @returns Interaction geometry authority bound to the snapshot.
 */
export function createQuireInteractionGeometryAuthority(
  options: QuireInteractionGeometryAuthorityOptions
): QuireInteractionGeometryAuthority {
  return new SnapshotBackedQuireInteractionGeometryAuthority(options.snapshot);
}
