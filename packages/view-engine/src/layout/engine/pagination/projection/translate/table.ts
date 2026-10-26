import type {
  QuireTableCellFragment,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../../table";
import type { QuireTableGridTrack } from "@quirekit/layout/table";
import type { QuireLayoutTranslation } from "../types";
import { translateQuireRect } from "./rect";

/** Cached page-projected table snapshot for one projection offset. */
interface QuireProjectedTableLayoutSnapshotCacheEntry {
  /** Horizontal page projection offset. */
  readonly dx: number;
  /** Vertical page projection offset. */
  readonly dy: number;
  /** Table snapshot translated for the offset pair. */
  readonly table: QuireTableLayoutSnapshot;
}

/** Page-projected table snapshots keyed by source table object identity. */
const projectedTableLayoutSnapshotStore =
  new WeakMap<QuireTableLayoutSnapshot, Map<string, QuireProjectedTableLayoutSnapshotCacheEntry>>();

/**
 * Translates table layout metadata owned by a projected table layout box.
 *
 * @param table - Table layout snapshot in infinite-flow coordinates.
 * @param projection - Page-body projection to apply.
 * @returns Table layout snapshot in page-projected document coordinates.
 */
export function translateQuireTableLayoutSnapshot(
  table: QuireTableLayoutSnapshot,
  projection: QuireLayoutTranslation
): QuireTableLayoutSnapshot {
  if (projection.dx === 0 && projection.dy === 0) {
    return table;
  }

  const key = createQuireTableProjectionOffsetKey(projection);
  const cached = projectedTableLayoutSnapshotStore.get(table)?.get(key);
  if (
    cached !== undefined &&
    cached.dx === projection.dx &&
    cached.dy === projection.dy
  ) {
    return cached.table;
  }

  const translated = {
    ...table,
    rect: translateQuireRect(table.rect, projection),
    tracks: table.tracks.map((track) => translateQuireTableGridTrack(track, projection)),
    rows: table.rows.map((row) => translateQuireTableRowFragment(row, projection)),
    cells: table.cells.map((cell) => translateQuireTableCellFragment(cell, projection)),
    hitTargets: table.hitTargets.map((target) =>
      translateQuireTableHitTarget(target, projection)
    )
  };

  let entries = projectedTableLayoutSnapshotStore.get(table);
  if (entries === undefined) {
    entries = new Map();
    projectedTableLayoutSnapshotStore.set(table, entries);
  }
  entries.set(key, {
    dx: projection.dx,
    dy: projection.dy,
    table: translated
  });

  return translated;
}

/**
 * Creates a stable key for one table projection offset pair.
 *
 * @param projection - Page-body projection being applied.
 * @returns Cache key for the projection's offset.
 */
function createQuireTableProjectionOffsetKey(
  projection: QuireLayoutTranslation
): string {
  return `${projection.dx}:${projection.dy}`;
}

/**
 * Translates one table grid track's horizontal origin.
 *
 * @param track - Grid track in infinite-flow coordinates.
 * @param projection - Page-body projection to apply.
 * @returns Grid track in page-projected document coordinates.
 */
function translateQuireTableGridTrack(
  track: QuireTableGridTrack,
  projection: QuireLayoutTranslation
): QuireTableGridTrack {
  return {
    ...track,
    x: track.x + projection.dx
  };
}

/**
 * Translates one table row fragment.
 *
 * @param row - Row fragment in infinite-flow coordinates.
 * @param projection - Page-body projection to apply.
 * @returns Row fragment in page-projected document coordinates.
 */
function translateQuireTableRowFragment(
  row: QuireTableRowFragment,
  projection: QuireLayoutTranslation
): QuireTableRowFragment {
  return {
    ...row,
    rect: translateQuireRect(row.rect, projection)
  };
}

/**
 * Translates one table cell fragment and its content rectangle.
 *
 * @param cell - Cell fragment in infinite-flow coordinates.
 * @param projection - Page-body projection to apply.
 * @returns Cell fragment in page-projected document coordinates.
 */
function translateQuireTableCellFragment(
  cell: QuireTableCellFragment,
  projection: QuireLayoutTranslation
): QuireTableCellFragment {
  return {
    ...cell,
    rect: translateQuireRect(cell.rect, projection),
    contentRect: translateQuireRect(cell.contentRect, projection),
    ...(cell.contentLayoutRect === undefined
      ? {}
      : {
          contentLayoutRect: translateQuireRect(cell.contentLayoutRect, projection)
        })
  };
}

/**
 * Translates one table hit target.
 *
 * @param target - Table hit target in infinite-flow coordinates.
 * @param projection - Page-body projection to apply.
 * @returns Table hit target in page-projected document coordinates.
 */
function translateQuireTableHitTarget(
  target: QuireTableHitTarget,
  projection: QuireLayoutTranslation
): QuireTableHitTarget {
  return {
    ...target,
    rect: translateQuireRect(target.rect, projection)
  };
}
