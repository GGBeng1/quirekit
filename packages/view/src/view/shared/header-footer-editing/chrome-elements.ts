import type { QuireRect } from "@quirekit/renderer";
import type { MountedHeaderFooterEditingRegion } from "./types";

/** Gap between the active boundary and its action bar. */
const actionGap = 6;

/**
 * Creates one body-facing header or footer boundary line.
 *
 * @param ownerDocument - Document used to create transient DOM elements.
 * @param region - Header or footer boundary represented by the line.
 * @param rect - Zero-height body-width boundary in document coordinates.
 * @param active - Whether this boundary owns the current editing session.
 * @returns Pointer-transparent dashed boundary.
 */
export function createHeaderFooterBoundaryGuide(
  ownerDocument: Document,
  region: MountedHeaderFooterEditingRegion,
  rect: QuireRect,
  active: boolean
): HTMLElement {
  const guide = ownerDocument.createElement("div");

  guide.dataset.qkHeaderFooterGuide = region;
  guide.dataset.qkHeaderFooterGuideActive = String(active);
  applyRectStyle(guide, rect);
  guide.style.boxSizing = "border-box";
  guide.style.borderTop = active
    ? "1px dashed var(--qk-color-action-primary, #4b67f2)"
    : "1px dashed var(--qk-color-border-strong, rgba(100, 116, 139, 0.5))";
  guide.style.pointerEvents = "none";
  return guide;
}

/**
 * Creates the region tag hanging from the active boundary at the body start edge.
 *
 * @param ownerDocument - Document used to create transient DOM elements.
 * @param region - Active header or footer region.
 * @param rect - Active zero-height boundary.
 * @param text - Localized region name.
 * @returns Pointer-transparent tag attached to the body side of the line.
 */
export function createHeaderFooterRegionTag(
  ownerDocument: Document,
  region: MountedHeaderFooterEditingRegion,
  rect: QuireRect,
  text: string
): HTMLElement {
  const tag = ownerDocument.createElement("div");

  tag.dataset.qkHeaderFooterBoundaryLabel = region;
  tag.textContent = text;
  tag.style.position = "absolute";
  tag.style.left = `${rect.x}px`;
  tag.style.top = `${rect.y}px`;
  // Header tags hang below the line; footer tags sit above it, both on the body side.
  tag.style.transform = region === "header" ? "" : "translateY(-100%)";
  tag.style.borderRadius = region === "header"
    ? "0 0 var(--qk-radius-control, 4px) var(--qk-radius-control, 4px)"
    : "var(--qk-radius-control, 4px) var(--qk-radius-control, 4px) 0 0";
  tag.style.padding = "1px 8px";
  // The tag sits on the paper, which stays light in every UI theme.
  tag.style.background = "color-mix(in srgb, var(--qk-color-action-primary, #4b67f2) 12%, #ffffff)";
  tag.style.color = "var(--qk-color-action-primary, #4b67f2)";
  tag.style.font = "500 var(--qk-type-helper-font-size, 12px)/var(--qk-type-helper-line-height, 18px) var(--qk-type-helper-font-family, system-ui, sans-serif)";
  tag.style.whiteSpace = "nowrap";
  tag.style.pointerEvents = "none";
  return tag;
}

/**
 * Creates the session-long host that positions the action bar.
 *
 * Pointer presses stay inside the host so the editor never treats them as
 * document gestures; focus behavior is left to the hosted controls.
 *
 * @param ownerDocument - Document used to create the host.
 * @param region - Active header or footer region.
 * @returns Unpositioned host for the session toolbar.
 */
export function createHeaderFooterActionGroup(
  ownerDocument: Document,
  region: MountedHeaderFooterEditingRegion
): HTMLElement {
  const actions = ownerDocument.createElement("div");

  actions.dataset.qkHeaderFooterActions = region;
  actions.style.position = "absolute";
  // Above the chrome root so the inactive wash never covers the bar.
  actions.style.zIndex = "7";
  actions.style.pointerEvents = "auto";
  actions.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  return actions;
}

/**
 * Aligns the action-bar host to the body end edge of the active boundary.
 *
 * @param actions - Session-long action host.
 * @param region - Active header or footer region.
 * @param rect - Active zero-height boundary.
 */
export function positionHeaderFooterActionGroup(
  actions: HTMLElement,
  region: MountedHeaderFooterEditingRegion,
  rect: QuireRect
): void {
  actions.style.left = `${rect.x + rect.width}px`;
  actions.style.top = `${rect.y}px`;
  actions.style.transform = region === "header"
    ? `translate(-100%, ${actionGap}px)`
    : `translate(-100%, calc(-100% - ${actionGap}px))`;
}

/**
 * Applies full-host positioning shared by the chrome root.
 *
 * @param element - Chrome root to style.
 */
export function applyFullOverlayStyle(element: HTMLElement): void {
  element.style.position = "absolute";
  element.style.inset = "0";
  element.style.zIndex = "6";
  element.style.pointerEvents = "none";
  element.style.overflow = "visible";
}

/**
 * Applies inactive-area masking without intercepting pointer input.
 *
 * @param element - Mask element to style.
 */
export function applyHeaderFooterInactiveMaskStyle(element: HTMLElement): void {
  // Paper-relative wash: the page stays light even when the UI theme is dark.
  element.style.background = "rgba(255, 255, 255, 0.6)";
  element.style.pointerEvents = "none";
}

/**
 * Positions one overlay element in document coordinates.
 *
 * @param element - Element receiving absolute rectangle geometry.
 * @param rect - Document-space rectangle to project.
 */
export function applyRectStyle(element: HTMLElement, rect: QuireRect): void {
  element.style.position = "absolute";
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${Math.max(0, rect.width)}px`;
  element.style.height = `${Math.max(0, rect.height)}px`;
}
