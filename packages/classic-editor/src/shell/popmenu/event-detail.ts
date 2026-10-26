/**
 * Reads custom-event detail without relying on the global realm constructor.
 *
 * @param event - Bubbling event dispatched by a mounted View root.
 * @returns Semantic detail, or undefined for ordinary browser events.
 */
export function readClassicEditorCustomEventDetail(event: Event): unknown {
  return "detail" in event
    ? (event as Event & { readonly detail: unknown }).detail
    : undefined;
}

/**
 * Reads a finite client anchor from semantic popmenu event detail.
 *
 * @param detail - Unknown custom-event detail.
 * @returns Finite browser client point or undefined.
 */
export function readClassicEditorPopmenuClientPoint(
  detail: unknown
): { readonly x: number; readonly y: number } | undefined {
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) {
    return undefined;
  }
  const point = (detail as { readonly clientPoint?: unknown }).clientPoint;
  if (point === null || typeof point !== "object" || Array.isArray(point)) {
    return undefined;
  }
  const { x, y } = point as { readonly x?: unknown; readonly y?: unknown };
  return typeof x === "number" && Number.isFinite(x)
    && typeof y === "number" && Number.isFinite(y)
    ? { x, y }
    : undefined;
}
