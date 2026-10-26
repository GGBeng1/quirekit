/**
 * Applies compact appearance-menu presentation.
 *
 * @param menu - Portalled menu surface.
 */
export function applyDrawingAppearanceMenuStyle(menu: HTMLElement): void {
  menu.style.boxSizing = "border-box";
  menu.style.width = "260px";
  menu.style.padding = "0";
  menu.style.border = "1px solid rgba(100, 116, 139, 0.24)";
  menu.style.borderRadius = "10px";
  menu.style.background = "rgb(255, 255, 255)";
  menu.style.boxShadow = "0 10px 28px rgba(15, 23, 42, 0.2)";
  menu.style.display = "grid";
  menu.style.gap = "0";
  menu.style.overflow = "visible";
}

/**
 * Applies appearance section-label typography.
 *
 * @param label - Section heading.
 */
export function applyDrawingAppearanceSectionLabelStyle(label: HTMLElement): void {
  label.style.margin = "9px 12px 4px";
  label.style.font = "600 12px system-ui, sans-serif";
  label.style.color = "rgb(71, 85, 105)";
}

/**
 * Applies a compact row of outline property choices.
 *
 * @param row - Row receiving width or dash buttons.
 */
export function applyDrawingAppearanceChoiceRowStyle(row: HTMLElement): void {
  row.style.display = "grid";
  row.style.gridAutoFlow = "column";
  row.style.gridAutoColumns = "1fr";
  row.style.gap = "4px";
  row.style.margin = "0 12px 10px";
}

/**
 * Applies one outline width or dash choice.
 *
 * @param button - Radio-like outline property choice.
 * @param selected - Whether the value is current.
 */
export function applyDrawingAppearanceChoiceStyle(
  button: HTMLButtonElement,
  selected: boolean
): void {
  button.style.height = "32px";
  button.style.padding = "0 7px";
  button.style.border = selected
    ? "1px solid rgb(37, 99, 235)"
    : "1px solid rgba(100, 116, 139, 0.24)";
  button.style.borderRadius = "5px";
  button.style.background = selected ? "rgb(239, 246, 255)" : "white";
  button.style.color = "rgb(30, 41, 59)";
  button.style.font = "500 12px system-ui, sans-serif";
  button.style.cursor = "pointer";
}
