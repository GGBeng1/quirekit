/**
 * Applies the shared custom-color panel presentation.
 *
 * @param panel - Custom-color root receiving framework-neutral styles.
 */
export function styleCustomColorPanel(panel: HTMLElement): void {
  panel.style.boxSizing = "border-box";
  panel.style.width = "260px";
  panel.style.padding = "12px";
  panel.style.color = "#252b36";
  panel.style.background = "#ffffff";
  panel.style.border = "1px solid #e2e5eb";
  panel.style.borderRadius = "8px";
  panel.style.boxShadow = "0 10px 28px rgba(26, 35, 52, 0.18)";
  panel.style.font = "12px/1.4 system-ui, sans-serif";
}

/**
 * Applies the saturation/value editing plane presentation.
 *
 * @param plane - Pointer-editable color plane.
 */
export function styleCustomColorPlane(plane: HTMLElement): void {
  plane.style.position = "relative";
  plane.style.height = "146px";
  plane.style.overflow = "hidden";
  plane.style.cursor = "crosshair";
  plane.style.backgroundImage = [
    "linear-gradient(to top, #000, transparent)",
    "linear-gradient(to right, #fff, transparent)"
  ].join(", ");
  plane.style.borderRadius = "4px";
  plane.style.touchAction = "none";
  plane.style.userSelect = "none";
}

/**
 * Applies the current saturation/value cursor presentation.
 *
 * @param cursor - Decorative position indicator.
 */
export function styleCustomColorCursor(cursor: HTMLElement): void {
  cursor.style.position = "absolute";
  cursor.style.width = "12px";
  cursor.style.height = "12px";
  cursor.style.border = "2px solid #ffffff";
  cursor.style.borderRadius = "50%";
  cursor.style.boxShadow = "0 0 0 1px rgba(22, 28, 38, 0.35)";
  cursor.style.transform = "translate(-50%, -50%)";
  cursor.style.pointerEvents = "none";
}

/**
 * Applies the hue and preview row layout.
 *
 * @param row - Row containing hue input and current-color preview.
 */
export function styleCustomColorSliderRow(row: HTMLElement): void {
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "12px";
  row.style.marginTop = "11px";
}

/**
 * Applies the native hue range presentation.
 *
 * @param input - Hue range input.
 */
export function styleCustomColorHue(input: HTMLInputElement): void {
  input.style.width = "100%";
  input.style.height = "12px";
  input.style.margin = "0";
  input.style.background = [
    "linear-gradient(90deg, #f00, #ff0 17%, #0f0 33%,",
    "#0ff 50%, #00f 67%, #f0f 83%, #f00)"
  ].join(" ");
  input.style.borderRadius = "6px";
  input.style.outline = "0";
  input.style.cursor = "pointer";
  input.style.accentColor = "#ffffff";
  input.style.setProperty("appearance", "none");
}

/**
 * Applies the current-color preview chip.
 *
 * @param preview - Decorative solid-color preview.
 */
export function styleCustomColorPreview(preview: HTMLElement): void {
  preview.style.width = "30px";
  preview.style.height = "30px";
  preview.style.flex = "0 0 30px";
  preview.style.border = "1px solid rgba(22, 28, 38, 0.12)";
  preview.style.borderRadius = "8px";
  preview.style.boxShadow = "0 2px 6px rgba(22, 28, 38, 0.12)";
}

/**
 * Applies the hexadecimal and RGB field row.
 *
 * @param row - Row receiving four labelled inputs.
 */
export function styleCustomColorInputRow(row: HTMLElement): void {
  row.style.display = "grid";
  row.style.gridTemplateColumns = "72px repeat(3, 1fr)";
  row.style.alignItems = "start";
  row.style.gap = "7px";
  row.style.marginTop = "12px";
}

/**
 * Applies one channel field layout.
 *
 * @param label - Label wrapping an input and channel name.
 */
export function styleCustomColorField(label: HTMLLabelElement): void {
  label.style.display = "grid";
  label.style.minWidth = "0";
  label.style.justifyItems = "center";
  label.style.gap = "4px";
  label.style.color = "#7b8290";
}

/**
 * Applies one compact custom-color channel input.
 *
 * @param input - Hexadecimal or numeric channel input.
 */
export function styleCustomColorInput(input: HTMLInputElement): void {
  input.style.boxSizing = "border-box";
  input.style.width = "100%";
  input.style.height = "28px";
  input.style.padding = "0 4px";
  input.style.color = "#252b36";
  input.style.background = "#ffffff";
  input.style.border = "1px solid #d7dce4";
  input.style.borderRadius = "5px";
  input.style.outline = "0";
  input.style.font = "12px/1 system-ui, sans-serif";
  input.style.textAlign = "center";
}
