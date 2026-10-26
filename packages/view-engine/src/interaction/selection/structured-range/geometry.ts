import type { Node as ProseMirrorNode } from "@quirekit/pm";
import {
  intersectQuireDocumentRanges,
  type QuireDocumentRange
} from "@quirekit/renderer";
import type {
  QuireLayoutSnapshot
} from "../../../editor-layout";
import type { QuireLayoutNode } from "../../../layout";
import { createQuireInteractionGeometryAuthority } from "../../geometry";
import type {
  QuireSelectionGeometryContext,
  QuireSelectionRangeGeometry
} from "../../types";
import type { QuireStructuredRangeSelection } from "./selection";
import type {
  QuireStructuredRangeStructureSegment
} from "./types";

/** Inputs used to project one structured selection into retained geometry. */
export interface QuireStructuredRangeSelectionGeometryOptions {
  /** Layout snapshot whose retained products own visible geometry. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Structured selection carrying exact text and structural segments. */
  readonly selection: QuireStructuredRangeSelection;
  /** Optional repeated-instance context retained by the pointer endpoints. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/**
 * Projects exact structured segments without painting unselected source gaps.
 *
 * @param options - Snapshot, structured selection, and optional visual context.
 * @returns Text-fragment and owner-box geometry in source-segment order.
 */
export function buildQuireStructuredRangeSelectionGeometries(
  options: QuireStructuredRangeSelectionGeometryOptions
): readonly QuireSelectionRangeGeometry[] {
  const geometryAuthority = createQuireInteractionGeometryAuthority({
    snapshot: options.snapshot
  });

  return options.selection.segments.flatMap((segment) => {
    if (segment.kind === "text") {
      if (!hasSelectableStructuredTextContent(
        options.snapshot.state.pm.doc,
        segment.range
      )) {
        return [];
      }

      return geometryAuthority.selectionRects(
        segment.range,
        options.selectionContext
      ).ranges;
    }

    const structural = buildStructureSegmentGeometries(
      options.snapshot.root.children ?? [],
      segment
    );

    // An external adapter may own a source shape whose layout provider has not
    // yet retained an exact owner box. Preserve visible selection through the
    // canonical range geometry instead of dropping the segment completely.
    return structural.length > 0
      ? structural
      : geometryAuthority.selectionRects(
          segment.range,
          options.selectionContext
        ).ranges;
  });
}

/**
 * Reports whether a structured text segment contains paintable document content.
 *
 * Source normalization can retain a one-position closing-token gap after a
 * structural owner. Such a gap contains no text, inline atom, block atom, or
 * empty textblock, so generic ancestor-box fallback must not turn it into a
 * page-sized selection rectangle.
 *
 * @param doc - Current ProseMirror document owning the segment.
 * @param range - Absolute half-open text segment range.
 * @returns Whether canonical text geometry may paint the segment.
 */
function hasSelectableStructuredTextContent(
  doc: ProseMirrorNode,
  range: QuireDocumentRange
): boolean {
  let hasSelectableContent = false;

  doc.nodesBetween(range.from, range.to, (node, position) => {
    if (hasSelectableContent) {
      return false;
    }

    const overlap = intersectQuireDocumentRanges(
      { from: position, to: position + node.nodeSize },
      range
    );
    if (overlap === null) {
      return false;
    }

    if (node.isText || node.isInline || node.isAtom) {
      hasSelectableContent = true;
      return false;
    }

    if (node.isTextblock && node.content.size === 0) {
      const contentPosition = position + 1;
      hasSelectableContent = range.from <= contentPosition
        && contentPosition <= range.to;
      return false;
    }

    return true;
  });

  return hasSelectableContent;
}

/**
 * Finds exact retained owner or semantic-unit boxes for one structural segment.
 *
 * Table row products and ordinary layout nodes participate through source
 * ranges, so the selection runtime does not branch on an adapter id.
 *
 * @param nodes - Retained layout subtree to inspect.
 * @param segment - Adapter-owned structural segment.
 * @returns Exact full-box geometries, including repeated visual fragments.
 */
function buildStructureSegmentGeometries(
  nodes: readonly QuireLayoutNode[],
  segment: QuireStructuredRangeStructureSegment
): readonly QuireSelectionRangeGeometry[] {
  const ranges: QuireSelectionRangeGeometry[] = [];

  for (const node of nodes) {
    if (
      node.table !== undefined &&
      areDocumentRangesEqual(node.table.tableRange, segment.ownerRange)
    ) {
      if (segment.units.length === 0) {
        ranges.push({
          range: segment.range,
          rect: node.rect,
          measurementPolicy: "preserve"
        });
      } else {
        for (const row of node.table.rows) {
          const unit = segment.units.find((candidate) =>
            intersectQuireDocumentRanges(candidate.range, row.range) !== null
          );
          if (unit !== undefined) {
            ranges.push({
              range: unit.range,
              rect: row.rect,
              measurementPolicy: "preserve"
            });
          }
        }
      }
      continue;
    }

    const exactRange = segment.units.length === 0
      ? segment.range
      : segment.units.find((unit) =>
          areDocumentRangesEqual(unit.range, node.range)
        )?.range;
    if (exactRange !== undefined && areDocumentRangesEqual(
      node.range,
      exactRange
    )) {
      ranges.push({
        range: exactRange,
        rect: node.rect,
        measurementPolicy: "preserve"
      });
      continue;
    }

    ranges.push(...buildStructureSegmentGeometries(
      node.children ?? [],
      segment
    ));
  }

  return ranges;
}

/**
 * Compares two half-open document ranges.
 *
 * @param left - First range.
 * @param right - Second range.
 * @returns Whether both endpoints match exactly.
 */
function areDocumentRangesEqual(
  left: { readonly from: number; readonly to: number },
  right: { readonly from: number; readonly to: number }
): boolean {
  return left.from === right.from && left.to === right.to;
}
