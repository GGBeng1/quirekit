import type { MdOutlineEntry } from "./types";

/**
 * Finds the last heading whose top has reached the reading line.
 * Heading tops grow with source position, so this binary search issues O(log n) geometry reads.
 * @param entries - Headings sorted by source position.
 * @param topOf - Client-space top of a heading start position.
 * @param readingLine - Client-space y of the reading line.
 * @returns Heading id, or the first heading while every heading is still below the line.
 */
export function findMdOutlineHeading(entries: readonly MdOutlineEntry[], topOf: (from: number) => number, readingLine: number): string | undefined {
  let low = 0, high = entries.length - 1, found = entries[0]?.id;
  while (low <= high) {
    const middle = (low + high) >> 1, entry = entries[middle]!;
    if (topOf(entry.from) <= readingLine) { found = entry.id; low = middle + 1; } else high = middle - 1;
  }
  return found;
}
