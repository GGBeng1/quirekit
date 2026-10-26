import type {
  QuireInteractionDiagnosticQuerySource,
  QuireInteractionMigrationFallbackUsage
} from "./types";

/**
 * Maps a query source to the fallback path it still exercises.
 *
 * @param source - Interaction query source.
 * @returns Fallback usage record, or undefined for retained query products.
 */
export function createQuireInteractionFallbackUsage(
  source: QuireInteractionDiagnosticQuerySource
): QuireInteractionMigrationFallbackUsage | undefined {
  switch (source) {
    case "retained-hit-target":
    case "retained-position":
    case "retained-nearest-caret":
      return undefined;
    case "layout-caret":
    case "layout-rect":
    case "layout-selection-rects":
      return {
        kind: "layout-snapshot-geometry-adapter",
        source,
        reason: "Geometry is still read from layout snapshot traversal while retained query products converge."
      };
    case "viewport-fallback":
      return {
        kind: "viewport-rect-fallback",
        source,
        reason: "No retained geometry matched, so the viewport rectangle was used."
      };
    case "sub-layout-input-anchor":
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Concatenates fallback usage arrays without duplicating identical records.
 *
 * @param first - Existing fallback records.
 * @param second - New fallback records.
 * @returns Ordered unique fallback records.
 */
export function mergeQuireInteractionFallbacks(
  first: readonly QuireInteractionMigrationFallbackUsage[] | undefined,
  second: readonly QuireInteractionMigrationFallbackUsage[] | undefined
): readonly QuireInteractionMigrationFallbackUsage[] {
  const merged: QuireInteractionMigrationFallbackUsage[] = [];

  for (const fallback of [...(first ?? []), ...(second ?? [])]) {
    const key = `${fallback.kind}:${fallback.source ?? ""}:${fallback.reason ?? ""}`;

    if (
      merged.some((entry) =>
        `${entry.kind}:${entry.source ?? ""}:${entry.reason ?? ""}` === key
      )
    ) {
      continue;
    }

    merged.push(fallback);
  }

  return merged;
}
