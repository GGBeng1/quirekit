import type { QuireLayoutDomOverlay } from "../core/overlay";
import { xhtmlNamespace } from "./constants";
import { createSvgElement } from "./elements";
import { formatSvgNumber } from "./format";

/**
 * Creates an SVG foreignObject for a DOM overlay.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param overlay - DOM overlay descriptor to convert.
 * @returns SVG foreignObject element.
 */
export function createSvgForeignObject(
  document: Document,
  overlay: QuireLayoutDomOverlay
): SVGElement {
  const foreignObject = createSvgElement(document, "foreignObject");
  const container = document.createElementNS(xhtmlNamespace, "div") as HTMLElement;

  foreignObject.setAttribute("x", formatSvgNumber(overlay.rect.x));
  foreignObject.setAttribute("y", formatSvgNumber(overlay.rect.y));
  foreignObject.setAttribute("width", formatSvgNumber(overlay.rect.width));
  foreignObject.setAttribute("height", formatSvgNumber(overlay.rect.height));

  if (overlay.ariaLabel !== undefined) {
    foreignObject.setAttribute("aria-label", overlay.ariaLabel);
  }

  if (overlay.role !== undefined) {
    foreignObject.setAttribute("role", overlay.role);
  }

  if (overlay.pointerEvents !== undefined) {
    foreignObject.setAttribute("pointer-events", overlay.pointerEvents);
  }

  container.setAttribute("data-quirekit-overlay-id", overlay.id);

  if (overlay.range !== undefined) {
    container.setAttribute("data-quirekit-range-from", formatSvgNumber(overlay.range.from));
    container.setAttribute("data-quirekit-range-to", formatSvgNumber(overlay.range.to));
  }

  container.innerHTML = overlay.html ?? "";
  foreignObject.append(container);

  return foreignObject;
}
