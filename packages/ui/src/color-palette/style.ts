/**
 * Applies the shared palette root presentation.
 *
 * @param root - Palette root receiving framework-neutral styles.
 */
export function styleColorPaletteRoot(root: HTMLElement): void {
  root.style.boxSizing = "border-box";
  root.style.width = "258px";
  root.style.padding = "12px 0 0";
  root.style.color = "#252b36";
  root.style.background = "#ffffff";
  root.style.font = "12px/1.4 system-ui, sans-serif";
}

/**
 * Applies a full-width palette action row.
 *
 * @param button - Default or more-colors action.
 * @param divided - Whether a top divider separates this action.
 */
export function styleColorPaletteAction(
  button: HTMLButtonElement,
  divided: boolean
): void {
  button.style.boxSizing = "border-box";
  button.style.width = divided ? "100%" : "calc(100% - 24px)";
  button.style.height = divided ? "40px" : "30px";
  button.style.margin = divided ? "12px 0 0" : "0 12px";
  button.style.padding = divided ? "0 12px" : "0";
  button.style.border = "0";
  button.style.borderTop = divided ? "1px solid #eceef2" : "0";
  button.style.borderRadius = "0";
  button.style.background = "transparent";
  button.style.color = "#252b36";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "8px";
  button.style.font = "inherit";
  button.style.cursor = "pointer";
}

/**
 * Applies the fixed ten-column document-color grid.
 *
 * @param grid - Preset-color grid receiving its shared layout.
 */
export function styleColorPaletteGrid(grid: HTMLElement): void {
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(10, 18px)";
  grid.style.gap = "6px";
  grid.style.margin = "8px 12px 0";
}

/**
 * Applies one document-color chip and its selected state.
 *
 * @param button - Color button.
 * @param color - Canonical visible color.
 * @param selected - Whether this chip is current.
 */
export function styleColorPaletteChip(
  button: HTMLButtonElement,
  color: string,
  selected: boolean
): void {
  button.style.position = "relative";
  button.style.boxSizing = "border-box";
  button.style.width = "18px";
  button.style.height = "18px";
  button.style.padding = "0";
  button.style.border = selected
    ? "2px solid #2563eb"
    : "1px solid rgba(22, 28, 38, 0.12)";
  button.style.borderRadius = "2px";
  button.style.background = color;
  button.style.boxShadow = selected ? "0 0 0 1px #ffffff inset" : "none";
  button.style.cursor = "pointer";
}

/**
 * Applies a reset-state chip, including explicit no-color presentation.
 *
 * @param chip - Reset indicator receiving its current paint.
 * @param color - Default color, or null for crossed no paint.
 */
export function styleColorPaletteDefaultChip(
  chip: HTMLElement,
  color: string | null
): void {
  chip.style.width = "18px";
  chip.style.height = "18px";
  chip.style.flex = "0 0 18px";
  chip.style.border = "1px solid rgba(22, 28, 38, 0.12)";
  chip.style.borderRadius = "2px";
  chip.style.background = color === null
    ? "linear-gradient(135deg, transparent 46%, #d92d20 47% 53%, transparent 54%), #ffffff"
    : color;
}

/**
 * Applies the recent-color section label.
 *
 * @param label - Recent-colors heading receiving shared typography.
 */
export function styleColorPaletteSectionLabel(label: HTMLElement): void {
  label.style.margin = "13px 12px 6px";
  label.style.color = "#6d7685";
}

/**
 * Applies the recent-color row.
 *
 * @param row - Recent-colors row receiving shared layout.
 */
export function styleColorPaletteRecentRow(row: HTMLElement): void {
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.margin = "0 12px";
}

/**
 * Applies the circular color-spectrum glyph.
 *
 * @param wheel - Decorative spectrum element receiving shared paint.
 */
export function styleColorWheel(wheel: HTMLElement): void {
  wheel.style.width = "18px";
  wheel.style.height = "18px";
  wheel.style.flex = "0 0 18px";
  wheel.style.background =
    "conic-gradient(#e53935, #facc15, #22c55e, #06b6d4, #2563eb, #9333ea, #e53935)";
  wheel.style.borderRadius = "50%";
}
