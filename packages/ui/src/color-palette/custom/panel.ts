import {
  hexToRgb,
  hsvToRgb,
  normalizeHexColor,
  rgbToHex,
  rgbToHsv
} from "../conversion";
import { resolveQuireCustomColorPanelLabel } from "../labels";
import { createCustomColorPanelElements } from "./elements";
import type {
  CreateQuireCustomColorPanelOptions,
  QuireCustomColorPanelController,
  QuireCustomColorPanelState,
  RgbColor
} from "../types";

/**
 * Creates one controlled, framework-neutral custom-color editing surface.
 *
 * @param options - Initial color, accessible copy, and semantic callback.
 * @returns Mounted editor element plus update and teardown lifecycle.
 */
export function createQuireCustomColorPanel(
  options: CreateQuireCustomColorPanelOptions
): QuireCustomColorPanelController {
  const elements = createCustomColorPanelElements(options.ownerDocument);
  let color = normalizeHexColor(options.value) ?? "#000000";
  let hsv = rgbToHsv(hexToRgb(color));
  let label = resolveQuireCustomColorPanelLabel(options.label, options.messages);
  let destroyed = false;

  /** Projects current color state into every editable control. */
  const render = (): void => {
    const rgb = hexToRgb(color);
    const hueColor = rgbToHex(hsvToRgb({
      hue: hsv.hue,
      saturation: 100,
      value: 100
    }));
    elements.root.setAttribute("aria-label", label);
    elements.plane.style.backgroundColor = hueColor;
    elements.cursor.style.left = `${hsv.saturation}%`;
    elements.cursor.style.top = `${100 - hsv.value}%`;
    elements.hue.value = String(hsv.hue);
    elements.preview.style.backgroundColor = color;
    elements.hex.value = color.slice(1);
    elements.red.value = String(Math.round(rgb.red));
    elements.green.value = String(Math.round(rgb.green));
    elements.blue.value = String(Math.round(rgb.blue));
    for (const [input, channel] of elements.channels) {
      input.setAttribute("aria-label", `${label} ${channel}`);
    }
  };

  /**
   * Commits one canonical color through the consumer callback.
   *
   * @param nextColor - Canonical color to project and emit.
   */
  const commit = (nextColor: string): void => {
    color = nextColor;
    hsv = rgbToHsv(hexToRgb(color));
    render();
    options.onChange(color);
  };

  /** Commits a complete hexadecimal input or restores the canonical value. */
  const commitHex = (): void => {
    const normalized = normalizeHexColor(elements.hex.value);
    if (normalized === undefined) {
      render();
      return;
    }
    commit(normalized);
  };

  /**
   * Commits one changed RGB input.
   *
   * @param channel - RGB channel owned by the changed input.
   * @param input - Numeric field supplying the next channel value.
   */
  const commitRgb = (channel: keyof RgbColor, input: HTMLInputElement): void => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) {
      render();
      return;
    }
    commit(rgbToHex({
      ...hexToRgb(color),
      [channel]: value
    }));
  };

  /**
   * Projects a plane pointer into saturation and value.
   *
   * @param event - Pointer event inside the saturation/value plane.
   */
  const updatePlane = (event: PointerEvent): void => {
    const bounds = elements.plane.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    hsv = {
      ...hsv,
      saturation: clamp(((event.clientX - bounds.left) / bounds.width) * 100),
      value: 100 - clamp(((event.clientY - bounds.top) / bounds.height) * 100)
    };
    color = rgbToHex(hsvToRgb(hsv));
    render();
  };

  elements.plane.addEventListener("pointerdown", (event) => {
    elements.plane.setPointerCapture?.(event.pointerId);
    updatePlane(event);
  });
  elements.plane.addEventListener("pointermove", (event) => {
    if (event.buttons !== 0) updatePlane(event);
  });
  elements.plane.addEventListener("pointerup", (event) => {
    updatePlane(event);
    commit(color);
  });
  elements.hue.addEventListener("input", () => {
    hsv = { ...hsv, hue: Number(elements.hue.value) };
    commit(rgbToHex(hsvToRgb(hsv)));
  });
  elements.hex.addEventListener("change", commitHex);
  elements.hex.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitHex();
    }
  });
  elements.red.addEventListener("change", () => commitRgb("red", elements.red));
  elements.green.addEventListener("change", () => commitRgb("green", elements.green));
  elements.blue.addEventListener("change", () => commitRgb("blue", elements.blue));
  render();

  return {
    element: elements.root,
    update(state: QuireCustomColorPanelState): void {
      if (destroyed) return;
      color = normalizeHexColor(state.value) ?? color;
      hsv = rgbToHsv(hexToRgb(color));
      label = resolveQuireCustomColorPanelLabel(state.label, state.messages);
      render();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      elements.root.remove();
    }
  };
}

/**
 * Keeps one percentage inside the custom-color editing value space.
 *
 * @param value - Candidate percentage.
 * @returns Clamped percentage.
 */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
