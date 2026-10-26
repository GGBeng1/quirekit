import type { QuireRect } from "@quirekit/renderer";

const toolbarGap = 10;

/**
 * Applies selected-object command-card styling in document coordinates.
 *
 * @param toolbar - Command-card root.
 * @param rect - Accepted selected drawing rectangle in document coordinates.
 */
export function applyDrawingCommandCardStyle(
  toolbar: HTMLElement,
  rect: QuireRect
): void {
  applyDrawingCommandCardPosition(toolbar, rect);
  toolbar.style.display = "flex";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "3px";
  toolbar.style.padding = "5px";
  toolbar.style.border = "1px solid var(--qk-color-border-subtle, rgba(100, 116, 139, 0.24))";
  toolbar.style.borderRadius = "8px";
  toolbar.style.background = "var(--qk-color-surface-overlay, rgba(255, 255, 255, 0.98))";
  toolbar.style.boxShadow = "var(--qk-elevation-overlay, 0 6px 20px rgba(15, 23, 42, 0.16))";
}

/**
 * Positions a toolbar without imposing another visual surface around product UI.
 * @param toolbar - Bare document-space positioning host.
 * @param rect - Accepted selected-object rectangle.
 */
export function applyDrawingCommandCardPosition(toolbar: HTMLElement, rect: QuireRect): void {
  toolbar.style.position = "absolute";
  toolbar.style.left = `${rect.x + rect.width / 2}px`;
  toolbar.style.top = `${rect.y - toolbarGap}px`;
  toolbar.style.transform = "translate(-50%, -100%)";
  toolbar.style.zIndex = "8";
  toolbar.style.pointerEvents = "auto";
  toolbar.style.whiteSpace = "nowrap";
}

/**
 * Applies shared focus-preserving command-button presentation.
 *
 * @param button - Button receiving compact contextual presentation.
 */
export function applyDrawingCommandButtonStyle(button: HTMLButtonElement): void {
  button.style.width = "30px";
  button.style.height = "30px";
  button.style.padding = "0";
  button.style.border = "0";
  button.style.borderRadius = "5px";
  button.style.background = "transparent";
  button.style.color = "var(--qk-color-text-secondary, rgb(51, 65, 85))";
  button.style.display = "grid";
  button.style.placeItems = "center";
  button.style.cursor = "pointer";
}

/**
 * Applies product-level presentation to one shared contextual tooltip portal.
 *
 * @param tooltip - Tooltip surface receiving readable transient chrome.
 */
export function applyDrawingCommandTooltipStyle(tooltip: HTMLElement): void {
  tooltip.style.position = "fixed";
  tooltip.style.zIndex = "10001";
  tooltip.style.transform = "translateX(-50%)";
  tooltip.style.maxWidth = "240px";
  tooltip.style.padding = "6px 9px";
  tooltip.style.border = "1px solid rgba(15, 23, 42, 0.16)";
  tooltip.style.borderRadius = "6px";
  tooltip.style.background = "rgb(30, 41, 59)";
  tooltip.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.22)";
  tooltip.style.color = "rgb(255, 255, 255)";
  tooltip.style.font = "500 12px/1.35 system-ui, sans-serif";
  tooltip.style.pointerEvents = "none";
  tooltip.style.whiteSpace = "nowrap";
}

/**
 * Applies compact WPS-like menu presentation below the layout button.
 *
 * @param menu - Menu surface mounted inside the command card.
 */
export function applyDrawingPaintOrderMenuStyle(menu: HTMLElement): void {
  menu.style.position = "absolute";
  menu.style.left = "0";
  menu.style.top = "calc(100% + 6px)";
  menu.style.minWidth = "252px";
  menu.style.padding = "8px";
  menu.style.border = "1px solid rgba(100, 116, 139, 0.24)";
  menu.style.borderRadius = "8px";
  menu.style.background = "rgb(255, 255, 255)";
  menu.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.18)";
  menu.style.display = "grid";
  menu.style.gap = "2px";
}

/**
 * Applies a compact three-column drawing layout grid.
 *
 * @param grid - Grid receiving the drawing-layout choices.
 */
export function applyDrawingLayoutGridStyle(grid: HTMLElement): void {
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "5px";
}

/**
 * Applies one drawing layout section label.
 *
 * @param label - Section label receiving menu typography.
 */
export function applyDrawingLayoutSectionLabelStyle(label: HTMLElement): void {
  label.style.padding = "4px 5px 2px";
  label.style.font = "600 13px system-ui, sans-serif";
  label.style.color = "rgb(30, 41, 59)";
}

/**
 * Applies one thumbnail preset and its selected state.
 *
 * @param button - Preset control receiving presentation.
 * @param selected - Whether the preset represents current source state.
 */
export function applyDrawingLayoutChoiceStyle(
  button: HTMLButtonElement,
  selected: boolean
): void {
  button.style.width = "68px";
  button.style.height = "52px";
  button.style.padding = "4px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.background = selected ? "rgb(226, 232, 240)" : "transparent";
  button.style.color = "rgb(51, 65, 85)";
  button.style.display = "grid";
  button.style.placeItems = "center";
  button.style.cursor = "pointer";
}

/**
 * Applies one paint-order row and its current-state presentation.
 *
 * @param item - Menu item to style.
 * @param checked - Whether the source anchor currently owns this value.
 */
export function applyDrawingPaintOrderItemStyle(
  item: HTMLButtonElement,
  checked: boolean
): void {
  item.style.height = "32px";
  item.style.padding = "0 10px";
  item.style.border = "0";
  item.style.borderRadius = "5px";
  item.style.background = checked ? "rgb(239, 246, 255)" : "transparent";
  item.style.color = "rgb(30, 41, 59)";
  item.style.display = "flex";
  item.style.alignItems = "center";
  item.style.justifyContent = "space-between";
  item.style.gap = "16px";
  item.style.font = "500 13px system-ui, sans-serif";
  item.style.cursor = "pointer";
  item.style.textAlign = "left";
}
