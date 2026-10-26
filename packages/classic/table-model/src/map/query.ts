import {
  rectsIntersect,
  unionRects
} from "./range";
import type {
  WordTableExplicitCellRef,
  WordTableGridRect,
  WordTableGridSlot,
  WordTableMap,
  WordTableMapDiagnostic,
  WordTableRowRef,
  WordTableSemanticCellRef
} from "./types";

/** Immutable data needed to create a queryable table map. */
export interface CreateWordTableMapFromDataOptions {
  /** Canonical table grid width. */
  readonly width: number;
  /** Number of source rows. */
  readonly height: number;
  /** Row refs in source order. */
  readonly rows: readonly WordTableRowRef[];
  /** Explicit cell refs in source order. */
  readonly explicitCells: readonly WordTableExplicitCellRef[];
  /** Semantic cell refs in source order. */
  readonly semanticCells: readonly WordTableSemanticCellRef[];
  /** Flattened row-major grid slots. */
  readonly slots: readonly WordTableGridSlot[];
  /** Diagnostics emitted while building the map. */
  readonly diagnostics: readonly WordTableMapDiagnostic[];
}

/**
 * Creates a queryable `WordTableMap` from already-derived table data.
 *
 * @param data - Immutable map data.
 * @returns Queryable table map.
 */
export function createWordTableMapFromData(
  data: CreateWordTableMapFromDataOptions
): WordTableMap {
  const explicitByPos = new Map(
    data.explicitCells.map((cell) => [cell.cellPos, cell] as const)
  );
  const semanticById = new Map(
    data.semanticCells.map((cell) => [cell.id, cell] as const)
  );

  const slotAt = (row: number, column: number): WordTableGridSlot | null => {
    if (row < 0 || column < 0 || row >= data.height || column >= data.width) {
      return null;
    }

    return data.slots[row * data.width + column] ?? null;
  };

  const cellAt = (
    row: number,
    column: number
  ): WordTableSemanticCellRef | null => {
    const slot = slotAt(row, column);

    if (slot?.kind !== "cell") {
      return null;
    }

    return semanticById.get(slot.semanticCellId) ?? null;
  };

  const cellsInRect = (
    rect: WordTableGridRect
  ): readonly WordTableSemanticCellRef[] => data.semanticCells.filter(
    (cell) => rectsIntersect(cell.rect, rect)
  );

  const expandRectToMergedCells = (
    rect: WordTableGridRect
  ): WordTableGridRect => {
    let expanded = rect;
    let changed = true;

    while (changed) {
      changed = false;

      for (const cell of data.semanticCells) {
        if (!rectsIntersect(expanded, cell.rect)) {
          continue;
        }

        const next = unionRects(expanded, cell.rect);
        changed = changed ||
          next.startRow !== expanded.startRow ||
          next.startColumn !== expanded.startColumn ||
          next.rowSpan !== expanded.rowSpan ||
          next.columnSpan !== expanded.columnSpan;
        expanded = next;
      }
    }

    return expanded;
  };

  return {
    ...data,
    findExplicitCell(cellPos) {
      return explicitByPos.get(cellPos) ?? null;
    },
    findSemanticCell(cellPos) {
      const explicit = explicitByPos.get(cellPos);

      return explicit?.semanticCellId
        ? semanticById.get(explicit.semanticCellId) ?? null
        : null;
    },
    cellAt,
    slotAt,
    cellsInRect,
    rectBetween(anchorCellPos, headCellPos) {
      const anchor = this.findSemanticCell(anchorCellPos);
      const head = this.findSemanticCell(headCellPos);

      return anchor && head ? unionRects(anchor.rect, head.rect) : null;
    },
    expandRectToMergedCells,
    positionAt(row, column) {
      return cellAt(row, column)?.originCellPos ?? null;
    },
    rowCells(row) {
      return cellsInRect({
        startRow: row,
        rowSpan: 1,
        startColumn: 0,
        columnSpan: data.width
      });
    },
    columnCells(column) {
      return cellsInRect({
        startRow: 0,
        rowSpan: data.height,
        startColumn: column,
        columnSpan: 1
      });
    }
  };
}
