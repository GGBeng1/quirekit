import type { QuireKitCommandListItem, QuireKitCommandListMovement } from "./types";

/**
 * Resolves the next enabled command in one wrapping linear menu.
 *
 * @param items - Ordered menu command declarations.
 * @param currentIndex - Current zero-based roving-focus position.
 * @param movement - Requested directional or boundary movement.
 * @returns Next enabled item, or the current index when no item enables.
 */
export function resolveQuireKitCommandListFocus(
  items: readonly QuireKitCommandListItem[],
  currentIndex: number,
  movement: QuireKitCommandListMovement
): number {
  const enabled = items
    .map((item, index) => item.disabled ? -1 : index)
    .filter((index) => index >= 0);
  if (enabled.length === 0) return currentIndex;
  if (movement === "home") return enabled[0]!;
  if (movement === "end") return enabled.at(-1)!;
  const direction = movement === "previous" ? -1 : 1;
  let candidate = currentIndex;
  for (let step = 0; step < items.length; step += 1) {
    candidate = (candidate + direction + items.length) % items.length;
    if (!items[candidate]?.disabled) return candidate;
  }
  return currentIndex;
}
