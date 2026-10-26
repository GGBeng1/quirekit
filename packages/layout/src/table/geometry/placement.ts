import { resolveQuireTableOuterEdgeShift } from "../border/occupancy/lines";
import { resolveQuireTableWidthToCssPixels } from "../grid";
import type {
  QuireTableGridTrack,
  QuireTableLayoutInput
} from "../types";

/** Horizontal placement facts resolved before table tracks are built. */
export interface QuireTablePlacement {
  /** C1 table indent applied to left/default placement. */
  readonly indent: number;
  /** Width available after applying placement offsets. */
  readonly availableWidth: number;
  /** Used table width in CSS pixels. */
  readonly width: number;
  /** Document-space x coordinate of the table. */
  readonly x: number;
}

/**
 * Resolves the table's horizontal placement from normalized source metadata.
 *
 * @param input - Table source and containing layout constraints.
 * @returns Placement facts consumed by track and fragment phases.
 */
export function resolveQuireTablePlacement(
  input: QuireTableLayoutInput
): QuireTablePlacement {
  const indent = resolveQuireTableLayoutIndent(input);
  const availableWidth = Math.max(1, input.constraints.rect.width - indent);
  const preferred = resolveQuireTableWidthToCssPixels(input.source.preferredWidth, availableWidth) ?? availableWidth;
  const width = input.constraints.fitToWidth === true ? Math.min(availableWidth, preferred) : preferred;

  return {
    indent,
    availableWidth,
    width,
    x: resolveQuireTableLayoutX(input, width, indent)
  };
}

/**
 * Narrows an automatic in-flow Table to the concrete width retained by tracks.
 *
 * Track resolution initially receives the complete containing width because
 * unresolved columns still need a finite constraint. Once every concrete
 * source/grid decision has produced physical tracks, their covered extent is
 * the authoritative used width for alignment. Explicit preferred widths and
 * floating placement stay on the first-pass contract.
 *
 * @param input - Table source and containing layout constraints.
 * @param placement - Provisional placement used to resolve tracks.
 * @param tracks - Provisional physical tracks.
 * @param cellSpacing - Effective outside and inter-cell spacing.
 * @returns Final placement used by rows, cells, and retained geometry.
 */
export function resolveQuireTablePlacementFromTracks(
  input: QuireTableLayoutInput,
  placement: QuireTablePlacement,
  tracks: readonly QuireTableGridTrack[],
  cellSpacing: number
): QuireTablePlacement {
  if (
    input.source.floating != null
    || resolveQuireTableWidthToCssPixels(
      input.source.preferredWidth,
      placement.availableWidth
    ) !== null
    || tracks.length === 0
  ) {
    return placement;
  }

  const trackLeft = Math.min(...tracks.map((track) => track.x));
  const trackRight = Math.max(
    ...tracks.map((track) => track.x + track.width)
  );
  const width = Math.min(
    placement.availableWidth,
    Math.max(1, trackRight - trackLeft + (cellSpacing * 2))
  );

  return {
    ...placement,
    width,
    x: resolveQuireTableLayoutX(input, width, placement.indent)
  };
}

/**
 * Resolves the C1 table indent applied before left/default table placement.
 *
 * @param input - Table source and layout constraints.
 * @returns CSS-pixel indent from the containing body start edge.
 */
function resolveQuireTableLayoutIndent(input: QuireTableLayoutInput): number {
  if (
    input.source.floating == null &&
    (input.source.alignment === "center" || input.source.alignment === "right")
  ) {
    return 0;
  }

  const indent = resolveQuireTableWidthToCssPixels(
    input.source.tableIndent,
    input.constraints.rect.width
  ) ?? 0;

  return Math.min(Math.max(0, indent), Math.max(0, input.constraints.rect.width));
}

/**
 * Resolves the table's horizontal origin inside the available body rect.
 *
 * @param input - Table source and layout constraints.
 * @param tableWidth - Resolved table width in CSS pixels.
 * @param tableIndent - Resolved table indent in CSS pixels.
 * @returns Document x coordinate for the table fragment.
 */
function resolveQuireTableLayoutX(
  input: QuireTableLayoutInput,
  tableWidth: number,
  tableIndent: number
): number {
  if (input.source.floating != null) {
    return input.constraints.rect.x + tableIndent;
  }

  const availableWidth = input.constraints.rect.width;
  const freeSpace = Math.max(0, availableWidth - tableWidth);

  if (input.source.alignment === "right") {
    return input.constraints.rect.x + freeSpace;
  }

  if (input.source.alignment === "center") {
    return input.constraints.rect.x + (freeSpace / 2);
  }

  return input.constraints.rect.x + tableIndent + resolveQuireTableOuterEdgeShift(input);
}
