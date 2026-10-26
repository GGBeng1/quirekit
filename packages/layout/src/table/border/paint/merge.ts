import type { QuireTableBorderPaint } from "../../types";

const borderPaintMergeEpsilon = 0.001;

/** Normalized table border paint span used while merging adjacent commands. */
type TableBorderPaintAxisRun = {
  readonly paint: QuireTableBorderPaint;
  readonly orientation: "horizontal" | "vertical";
  readonly axis: number;
  readonly start: number;
  readonly end: number;
  readonly order: number;
};

/**
 * Coalesces adjacent collinear border paints that share the same stroke attrs.
 *
 * @param paints - Border paint descriptors produced from resolved physical edges.
 * @returns Border paints with compatible adjacent spans merged.
 */
export function mergeAdjacentQuireTableBorderPaints(
  paints: readonly QuireTableBorderPaint[]
): readonly QuireTableBorderPaint[] {
  const grouped = groupTableBorderPaintAxisRuns(paints);

  return Array.from(grouped.values())
    .sort((left, right) => left[0]!.order - right[0]!.order)
    .flatMap(mergeTableBorderPaintAxisRunGroup);
}

/**
 * Groups paint runs by orientation, axis, and stroke attributes.
 *
 * @param paints - Border paints to group.
 * @returns Groups of merge-compatible axis runs.
 */
function groupTableBorderPaintAxisRuns(
  paints: readonly QuireTableBorderPaint[]
): Map<string, TableBorderPaintAxisRun[]> {
  const grouped = new Map<string, TableBorderPaintAxisRun[]>();

  paints.forEach((paint, order) => {
    const run = createTableBorderPaintAxisRun(paint, order);
    const key = createTableBorderPaintMergeKey(run);
    const group = grouped.get(key) ?? [];

    group.push(run);
    grouped.set(key, group);
  });

  return grouped;
}

/**
 * Normalizes one border paint to an axis-aligned run.
 *
 * @param paint - Border paint to normalize.
 * @param order - Source order of the paint descriptor.
 * @returns Axis metadata for merge checks.
 */
function createTableBorderPaintAxisRun(
  paint: QuireTableBorderPaint,
  order: number
): TableBorderPaintAxisRun {
  const deltaX = Math.abs(paint.to.x - paint.from.x);
  const deltaY = Math.abs(paint.to.y - paint.from.y);
  const orientation = deltaX >= deltaY
    ? "horizontal"
    : "vertical";

  return orientation === "horizontal"
    ? {
        paint,
        orientation,
        axis: paint.from.y,
        start: Math.min(paint.from.x, paint.to.x),
        end: Math.max(paint.from.x, paint.to.x),
        order
      }
    : {
        paint,
        orientation,
        axis: paint.from.x,
        start: Math.min(paint.from.y, paint.to.y),
        end: Math.max(paint.from.y, paint.to.y),
        order
      };
}

/**
 * Creates the merge key for a normalized paint run.
 *
 * @param run - Paint run to key.
 * @returns Stable key for merge-compatible spans.
 */
function createTableBorderPaintMergeKey(run: TableBorderPaintAxisRun): string {
  return [
    run.orientation,
    formatTableBorderPaintCoordinate(run.axis),
    run.paint.strokeStyle,
    run.paint.lineWidth,
    run.paint.lineCap ?? "",
    createLineDashKey(run.paint.lineDash)
  ].join(":");
}

/**
 * Merges one group of collinear paint runs.
 *
 * @param runs - Paint runs sharing axis and stroke attributes.
 * @returns Merged paint descriptors for the group.
 */
function mergeTableBorderPaintAxisRunGroup(
  runs: readonly TableBorderPaintAxisRun[]
): readonly QuireTableBorderPaint[] {
  const sorted = [...runs].sort((left, right) =>
    left.start - right.start || left.order - right.order
  );
  const merged: QuireTableBorderPaint[] = [];
  let currentStart = sorted[0];

  if (!currentStart) {
    return merged;
  }

  let currentEnd = currentStart;

  for (const next of sorted.slice(1)) {
    if (next.start <= currentEnd.end + borderPaintMergeEpsilon) {
      if (next.end > currentEnd.end) {
        currentEnd = next;
      }
      continue;
    }

    merged.push(createMergedTableBorderPaint(currentStart, currentEnd));
    currentStart = next;
    currentEnd = next;
  }

  merged.push(createMergedTableBorderPaint(currentStart, currentEnd));

  return merged;
}

/**
 * Creates one border paint from the first and last run in a merged span.
 *
 * @param start - First run in the merged span.
 * @param end - Last run in the merged span.
 * @returns Merged border paint descriptor.
 */
function createMergedTableBorderPaint(
  start: TableBorderPaintAxisRun,
  end: TableBorderPaintAxisRun
): QuireTableBorderPaint {
  const id = start.paint.id === end.paint.id
    ? start.paint.id
    : `${start.paint.id}..${end.paint.id}`;
  const from = start.orientation === "horizontal"
    ? { x: start.start, y: start.axis }
    : { x: start.axis, y: start.start };
  const to = start.orientation === "horizontal"
    ? { x: end.end, y: start.axis }
    : { x: start.axis, y: end.end };

  return {
    id,
    from,
    to,
    strokeStyle: start.paint.strokeStyle,
    lineWidth: start.paint.lineWidth,
    ...(start.paint.lineCap === undefined ? {} : { lineCap: start.paint.lineCap }),
    ...(start.paint.lineDash === undefined ? {} : { lineDash: start.paint.lineDash })
  };
}

/**
 * Creates a stable key for a dash pattern.
 *
 * @param lineDash - Optional dash pattern.
 * @returns Dash key suitable for merge grouping.
 */
function createLineDashKey(lineDash: readonly number[] | undefined): string {
  return lineDash === undefined
    ? ""
    : lineDash.map(formatTableBorderPaintCoordinate).join(",");
}

/**
 * Formats a coordinate for stable merge keys.
 *
 * @param coordinate - Coordinate to format.
 * @returns Compact coordinate string.
 */
function formatTableBorderPaintCoordinate(coordinate: number): string {
  return Number.isInteger(coordinate)
    ? coordinate.toString()
    : coordinate.toFixed(3).replace(/\.?0+$/u, "");
}
