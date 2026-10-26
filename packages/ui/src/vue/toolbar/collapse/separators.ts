/** Upper bound on re-checks; hiding a 1px separator rarely changes wrapping, so this almost always settles in one. */
const maxPasses = 3;

/** Vertical tolerance, in CSS pixels, for treating two controls as sitting on the same wrapped line. */
const lineTolerance = 4;

/**
 * Hides separators that start or end a wrapped line in the "more" panel, where they would read as stray marks.
 * @param container - Element whose direct children are the panel's controls and separators.
 */
export function hideLineEdgeSeparators(container: HTMLElement): void {
  const separators = [...container.children].filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains("qk-toolbar__separator")
  );
  for (const separator of separators) separator.style.removeProperty("display");
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const separator of separators) {
      if (separator.style.display === "none") continue;
      const line = centerOf(separator);
      const previous = visibleSibling(separator, "previousElementSibling");
      const next = visibleSibling(separator, "nextElementSibling");
      const startsLine = previous === null || Math.abs(centerOf(previous) - line) > lineTolerance;
      const endsLine = next === null || Math.abs(centerOf(next) - line) > lineTolerance;
      if (startsLine || endsLine) {
        separator.style.display = "none";
        changed = true;
      }
    }
    if (!changed) return;
  }
}

/**
 * @param element - Panel child.
 * @returns Vertical center used to identify its wrapped line.
 */
function centerOf(element: Element): number {
  const rect = element.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

/**
 * @param element - Separator.
 * @param direction - Sibling direction.
 * @returns Nearest sibling that is still displayed, or null at the panel edge.
 */
function visibleSibling(element: Element, direction: "previousElementSibling" | "nextElementSibling"): HTMLElement | null {
  let current = element[direction];
  while (current instanceof HTMLElement && current.style.display === "none") current = current[direction];
  return current instanceof HTMLElement ? current : null;
}
