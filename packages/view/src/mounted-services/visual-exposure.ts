/**
 * Temporarily removes duplicate visual content while an explicit reading surface owns focus.
 * @param elements - Backend-owned document presentation roots, excluding native input/overlays.
 * @returns Idempotent restoration, or null if hiding would contain the active element.
 */
export function suspendVisualAccessibility(elements: readonly HTMLElement[]): (() => void) | null {
  if (elements.some((element) => {
    const root = element.getRootNode?.() as Document | ShadowRoot | undefined;
    const active = root?.activeElement ?? element.ownerDocument.activeElement;
    return active !== null && element.contains(active);
  })) return null;
  const previous = elements.map((element) => element.getAttribute("aria-hidden"));
  elements.forEach((element) => element.setAttribute("aria-hidden", "true"));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    elements.forEach((element, index) => {
      if (element.getAttribute("aria-hidden") !== "true") return;
      const value = previous[index];
      if (value == null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", value);
    });
  };
}
