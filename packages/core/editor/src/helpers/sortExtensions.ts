import type { QuireAnyExtension } from "../types";

/**
 * Sorts extensions in descending priority order.
 *
 * @param extensions - Extensions to sort by priority.
 * @returns A new extension array ordered from highest to lowest priority.
 */
export function sortExtensions(
  extensions: readonly QuireAnyExtension[]
): readonly QuireAnyExtension[] {
  return [...extensions].sort((left, right) => (right.priority ?? 100) - (left.priority ?? 100));
}
