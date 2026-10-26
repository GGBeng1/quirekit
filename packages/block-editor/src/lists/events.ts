import type { BlockListMarkerMenuDetail } from "./types";

/** Bubbled product intent handled inside the owning Block editor only. */
export const blockListMarkerMenuEventName = "quirekit:block-list-marker-menu";

/**
 * Bridges a renderer's live marker position into the product overlay.
 * @param element - Connected marker serving as the client-space anchor.
 * @param position - Paragraph position resolved at activation time.
 */
export function openBlockListMarkerMenu(element: HTMLElement, position: number): void {
  const EventConstructor = element.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) return;
  element.dispatchEvent(new EventConstructor<BlockListMarkerMenuDetail>(blockListMarkerMenuEventName, {
    bubbles: true, detail: { position }
  }));
}
