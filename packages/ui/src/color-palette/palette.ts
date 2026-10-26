import { resolveQuireColorPaletteLabels } from "./labels";
import { quireDocumentColorRows } from "./presets";
import {
  styleColorPaletteAction,
  styleColorPaletteChip,
  styleColorPaletteDefaultChip,
  styleColorPaletteGrid,
  styleColorPaletteRecentRow,
  styleColorPaletteRoot,
  styleColorPaletteSectionLabel,
  styleColorWheel
} from "./style";
import type {
  CreateQuireColorPaletteOptions,
  QuireColorPaletteController,
  QuireColorPaletteLabels,
  QuireColorPaletteState
} from "./types";

/** Controlled state with complete copy, as rendered by the palette helpers. */
interface ResolvedPaletteState extends QuireColorPaletteState {
  /** Complete copy resolved from host labels and the active language. */
  readonly labels: QuireColorPaletteLabels;
}

/**
 * @param state - Controlled presentation state.
 * @returns The state with complete copy.
 */
function resolveState(state: QuireColorPaletteState): ResolvedPaletteState {
  return { ...state, labels: resolveQuireColorPaletteLabels(state.labels, state.messages) };
}

/**
 * Creates one controlled, framework-neutral document color palette.
 *
 * @param options - Initial state, localized copy, and semantic callbacks.
 * @returns Mounted palette element plus update and teardown lifecycle.
 */
export function createQuireColorPalette(
  options: CreateQuireColorPaletteOptions
): QuireColorPaletteController {
  const root = options.ownerDocument.createElement("div");
  let state = resolveState(options);
  let destroyed = false;
  root.dataset.qkColorPalette = "true";
  root.setAttribute("role", "group");
  styleColorPaletteRoot(root);

  /** Rebuilds descendants from complete controlled state. */
  const render = (): void => {
    root.replaceChildren();
    root.setAttribute("aria-label", state.labels.label);
    root.append(createResetAction(options, state));
    const grid = options.ownerDocument.createElement("div");
    grid.dataset.qkColorGrid = "true";
    styleColorPaletteGrid(grid);
    for (const row of quireDocumentColorRows) {
      for (const color of row) {
        grid.append(createColorButton(options, state, color));
      }
    }
    root.append(grid);
    if (state.recentColors.length > 0) {
      root.append(createRecentSection(options, state));
    }
    if (options.onMoreColors !== undefined) {
      root.append(createMoreColorsAction(options, state));
    }
  };

  render();
  return {
    element: root,
    update(nextState): void {
      if (destroyed) {
        return;
      }
      state = resolveState(nextState);
      render();
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      root.remove();
    }
  };
}

/**
 * Creates the consumer-defined reset or no-paint action.
 *
 * @param options - Palette callbacks and owner document.
 * @param state - Current controlled presentation.
 * @returns Reset action row.
 */
function createResetAction(
  options: CreateQuireColorPaletteOptions,
  state: ResolvedPaletteState
): HTMLButtonElement {
  const button = options.ownerDocument.createElement("button");
  button.type = "button";
  button.dataset.qkColorDefault = "true";
  button.setAttribute("aria-label", state.labels.defaultColor);
  styleColorPaletteAction(button, false);
  const chip = options.ownerDocument.createElement("span");
  chip.setAttribute("aria-hidden", "true");
  styleColorPaletteDefaultChip(chip, state.defaultColor);
  button.append(chip, state.labels.defaultColor);
  button.addEventListener("pointerdown", preserveEditorFocus);
  button.addEventListener("click", options.onReset);
  return button;
}

/**
 * Creates one preset or recent controlled color button.
 *
 * @param options - Palette callbacks and owner document.
 * @param state - Current controlled presentation.
 * @param color - Canonical color represented by the button.
 * @returns Accessible color control.
 */
function createColorButton(
  options: CreateQuireColorPaletteOptions,
  state: ResolvedPaletteState,
  color: string
): HTMLButtonElement {
  const button = options.ownerDocument.createElement("button");
  const selected = state.value?.toUpperCase() === color.toUpperCase();
  button.type = "button";
  button.dataset.qkColorValue = color;
  button.setAttribute("aria-label", `${state.labels.label} ${color}`);
  button.setAttribute("aria-pressed", String(selected));
  styleColorPaletteChip(button, color, selected);
  button.addEventListener("pointerenter", () => {
    button.style.border = "2px solid rgba(37, 99, 235, 0.5)";
  });
  button.addEventListener("pointerleave", () => {
    button.style.border = selected
      ? "2px solid #2563eb"
      : "1px solid rgba(22, 28, 38, 0.12)";
  });
  button.addEventListener("pointerdown", preserveEditorFocus);
  button.addEventListener("click", () => options.onSelect(color));
  return button;
}

/**
 * Creates the optional recent-colors heading and row.
 *
 * @param options - Palette callbacks and owner document.
 * @param state - Current controlled presentation.
 * @returns Recent-color section.
 */
function createRecentSection(
  options: CreateQuireColorPaletteOptions,
  state: ResolvedPaletteState
): DocumentFragment {
  const fragment = options.ownerDocument.createDocumentFragment();
  const label = options.ownerDocument.createElement("p");
  label.textContent = state.labels.recentColors;
  styleColorPaletteSectionLabel(label);
  fragment.append(label);
  const row = options.ownerDocument.createElement("div");
  row.dataset.qkRecentColors = "true";
  styleColorPaletteRecentRow(row);
  for (const color of state.recentColors) {
    row.append(createColorButton(options, state, color));
  }
  fragment.append(row);
  return fragment;
}

/**
 * Creates the optional consumer-owned custom-color entry.
 *
 * @param options - Palette callbacks and owner document.
 * @param state - Current controlled presentation.
 * @returns More-colors action row.
 */
function createMoreColorsAction(
  options: CreateQuireColorPaletteOptions,
  state: ResolvedPaletteState
): HTMLButtonElement {
  const button = options.ownerDocument.createElement("button");
  button.type = "button";
  button.dataset.qkColorMore = "true";
  styleColorPaletteAction(button, true);
  const wheel = options.ownerDocument.createElement("span");
  wheel.setAttribute("aria-hidden", "true");
  styleColorWheel(wheel);
  const arrow = options.ownerDocument.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.style.marginLeft = "auto";
  arrow.style.color = "#87909f";
  arrow.style.fontSize = "20px";
  arrow.textContent = "›";
  button.append(wheel, state.labels.moreColors, arrow);
  button.addEventListener("pointerdown", preserveEditorFocus);
  button.addEventListener("click", () => options.onMoreColors?.());
  return button;
}

/**
 * Keeps a document-editor selection authoritative while a palette control is used.
 *
 * @param event - Pointer transition targeting a palette control.
 */
function preserveEditorFocus(event: PointerEvent): void {
  event.preventDefault();
}
