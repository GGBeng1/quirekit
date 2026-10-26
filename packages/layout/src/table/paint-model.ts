import type {
  QuireTableBackgroundPaint,
  QuireTableBorderPaint,
  QuireTableCellGeometry,
  QuireTableGeometrySnapshot,
  QuireTablePaintModel
} from "./types";
import type { QuireTableBorder } from "./types";
import { resolveQuireTableBorderSegments } from "./border";
import { mergeAdjacentQuireTableBorderPaints } from "./border/paint/merge";
import { resolveHorizontalBandOffset } from "./border/paint/band";
import { createPhysicalBorderPaint } from "./border/paint/physical";
import { expandQuireTableBorderPaintStrokes } from "./border/paint/strokes";
import {
  isConcreteQuireTableBorder,
  resolveQuireTableBorderColor,
  resolveQuireTableBorderLineDash,
  resolveQuireTableBorderWidth
} from "./border/style";

const defaultTableFillStyle = "#ffffff";


/** Line cap used by diagonal borders after endpoint insetting. */
const tableDiagonalBorderLineCap = "butt";

const diagonalBorderEpsilon = 0.001;

/** Cell diagonal border side names preserved from normalized source attributes. */
type QuireTableDiagonalBorderSide = "tl2br" | "tr2bl";

/**
 * Builds a renderer-neutral C1 table paint model from table geometry.
 *
 * @param snapshot - Table layout snapshot to paint.
 * @returns Paint model containing backgrounds, content clips, and solid borders.
 */
export function buildQuireTablePaintModel(
  snapshot: QuireTableGeometrySnapshot
): QuireTablePaintModel {
  return {
    backgrounds: [
      createTableBackground(snapshot),
      ...createCellBackgrounds(snapshot)
    ],
    contentClips: snapshot.cells.map((cell) => ({
      id: `${cell.id}:clip`,
      semanticCellId: cell.semanticCellId,
      rect: cell.contentRect
    })),
    borders: [
      ...mergeAdjacentQuireTableBorderPaints(
        resolveQuireTableBorderSegments({ snapshot }).flatMap((segment) =>
          createPhysicalBorderPaint(segment, resolveHorizontalBandOffset(snapshot, segment), (snapshot.cellSpacing ?? 0) <= 0)
        )
      ),
      ...createDiagonalBorderPaints(snapshot)
    ]
  };
}

/**
 * Creates the table-level background paint descriptor.
 *
 * @param snapshot - Table layout snapshot to inspect.
 * @returns Table background paint descriptor.
 */
function createTableBackground(
  snapshot: QuireTableGeometrySnapshot
): QuireTableBackgroundPaint {
  return {
    id: `${snapshot.geometryId}:background`,
    range: snapshot.tableRange,
    rect: snapshot.rect,
    fillStyle: snapshot.style.backgroundColor ?? defaultTableFillStyle
  };
}

/**
 * Creates cell background descriptors for cells with concrete shading fills.
 *
 * @param snapshot - Table layout snapshot to inspect.
 * @returns Cell background paint descriptors in source cell order.
 */
function createCellBackgrounds(
  snapshot: QuireTableGeometrySnapshot
): readonly QuireTableBackgroundPaint[] {
  return snapshot.cells.flatMap((cell) => {
    const fillStyle = resolveCellBackgroundFill(cell);

    return fillStyle === null
      ? []
      : [{
          id: `${cell.id}:background`,
          range: cell.range,
          rect: cell.rect,
          fillStyle
        }];
  });
}

/**
 * Creates diagonal cell border paint descriptors for every page-local cell.
 *
 * Diagonal borders do not participate in shared-edge conflict resolution
 * because they are owned entirely by the source cell rectangle.
 *
 * @param snapshot - Table layout snapshot to inspect.
 * @returns Diagonal border paints in page-local cell order.
 */
function createDiagonalBorderPaints(
  snapshot: QuireTableGeometrySnapshot
): readonly QuireTableBorderPaint[] {
  return snapshot.cells.flatMap(createCellDiagonalBorderPaints);
}

/**
 * Creates diagonal border paints for a single cell fragment.
 *
 * @param cell - Cell fragment whose diagonal borders should be painted.
 * @returns Visible diagonal border paints for the cell.
 */
function createCellDiagonalBorderPaints(
  cell: QuireTableCellGeometry
): readonly QuireTableBorderPaint[] {
  return [
    createCellDiagonalBorderPaint(cell, "tl2br", cell.borders?.tl2br ?? null),
    createCellDiagonalBorderPaint(cell, "tr2bl", cell.borders?.tr2bl ?? null)
  ].flat();
}

/**
 * Creates one diagonal border paint descriptor.
 *
 * @param cell - Cell fragment owning the diagonal border.
 * @param side - Diagonal border side.
 * @param border - Normalized border value to resolve.
 * @returns Diagonal border paint descriptors, or an empty array when empty.
 */
function createCellDiagonalBorderPaint(
  cell: QuireTableCellGeometry,
  side: QuireTableDiagonalBorderSide,
  border: QuireTableBorder | null
): readonly QuireTableBorderPaint[] {
  if (!isConcreteQuireTableBorder(border)) {
    return [];
  }

  const right = cell.rect.x + cell.rect.width;
  const bottom = cell.rect.y + cell.rect.height;
  const lineDash = resolveQuireTableBorderLineDash(border);

  const basePaint: QuireTableBorderPaint = {
    id: `${cell.id}:border-${side}`,
    from: side === "tl2br"
      ? { x: cell.rect.x, y: cell.rect.y }
      : { x: right, y: cell.rect.y },
    to: side === "tl2br"
      ? { x: right, y: bottom }
      : { x: cell.rect.x, y: bottom },
    strokeStyle: resolveQuireTableBorderColor(border),
    lineWidth: resolveQuireTableBorderWidth(border),
    lineCap: tableDiagonalBorderLineCap,
    ...(lineDash === undefined ? {} : { lineDash })
  };

  return expandQuireTableBorderPaintStrokes(border, basePaint).map(
    insetDiagonalBorderPaint
  );
}

/**
 * Insets diagonal strokes by half their own stroke width.
 *
 * Orthogonal table borders use square caps to close shared-edge gaps, but a
 * square cap on a diagonal projects past the cell corner. Insetting keeps the
 * visible stroke inside the cell border box while preserving the line's slope.
 *
 * @param paint - Diagonal border paint to inset.
 * @returns Diagonal paint with softened endpoints.
 */
function insetDiagonalBorderPaint(
  paint: QuireTableBorderPaint
): QuireTableBorderPaint {
  const deltaX = paint.to.x - paint.from.x;
  const deltaY = paint.to.y - paint.from.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= diagonalBorderEpsilon) {
    return paint;
  }

  const inset = paint.lineWidth / 2;
  const unitX = deltaX / length;
  const unitY = deltaY / length;

  return {
    ...paint,
    from: {
      x: paint.from.x + (unitX * inset),
      y: paint.from.y + (unitY * inset)
    },
    to: {
      x: paint.to.x - (unitX * inset),
      y: paint.to.y - (unitY * inset)
    }
  };
}

/**
 * Resolves a cell background fill into a CSS-like paint color.
 *
 * Structured shading owns the richer source metadata, while `backgroundColor` is a
 * CSS-compatible shortcut used by simpler adapters. Prefer concrete shading and
 * fall back to the shortcut only when shading has no concrete fill.
 *
 * @param cell - Cell fragment whose background should be inspected.
 * @returns Paint color, or null when the cell has no concrete fill.
 */
function resolveCellBackgroundFill(cell: QuireTableCellGeometry): string | null {
  return resolveColorFill(cell.shading?.fill) ??
    resolveColorFill(cell.backgroundColor ?? null);
}

/**
 * Resolves a source color token into a CSS-like paint color.
 *
 * @param fill - Source fill token.
 * @returns Paint color, or null when the token is not concrete.
 */
function resolveColorFill(fill: string | null | undefined): string | null {
  if (!fill || fill === "auto") {
    return null;
  }

  return /^[0-9a-f]{6}$/iu.test(fill) ? `#${fill}` : fill;
}
