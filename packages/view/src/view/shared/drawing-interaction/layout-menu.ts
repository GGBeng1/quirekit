import type { DrawingAnchor, DrawingAnchorMovement, DrawingAnchorPatch } from "@quirekit/drawing-geometry";
import {
  applyDrawingLayoutChoiceStyle,
  applyDrawingLayoutGridStyle,
  applyDrawingLayoutSectionLabelStyle,
  applyDrawingPaintOrderItemStyle,
  applyDrawingPaintOrderMenuStyle
} from "./command/card-style";
import type { DrawingContextualMessages } from "./command/types";

/** User-facing drawing layout presets shared by text boxes, images, and shapes. */
export type DrawingLayoutPreset =
  | "inline"
  | "square"
  | "tight"
  | "through"
  | "top-and-bottom"
  | "behind-text"
  | "in-front-of-text";

const layoutChoices = [
  "inline",
  "square",
  "tight",
  "through",
  "top-and-bottom",
  "behind-text",
  "in-front-of-text"
] as const satisfies readonly DrawingLayoutPreset[];

/**
 * Creates the complete drawing layout menu backed by canonical Word attrs.
 *
 * @param ownerDocument - Document creating the menu controls.
 * @param current - Current validated drawing anchor attributes.
 * @param messages - Localized drawing menu copy.
 * @param onChange - Word-command callback for a semantic patch.
 * @returns Layout preset grid plus anchored movement radio choices.
 */
export function createDrawingLayoutMenu(
  ownerDocument: Document,
  current: DrawingAnchor,
  messages: DrawingContextualMessages,
  onChange: (patch: DrawingAnchorPatch) => boolean
): HTMLElement {
  const menu = ownerDocument.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", messages.objectLayout);
  menu.dataset.qkDrawingAppearanceMenu = "layout";
  applyDrawingPaintOrderMenuStyle(menu);

  appendSectionLabel(ownerDocument, menu, messages.inlineSection);
  const inlineGrid = createGrid(ownerDocument);
  appendLayoutChoice(
    ownerDocument,
    inlineGrid,
    layoutChoices[0],
    messages,
    current,
    onChange
  );
  menu.append(inlineGrid);

  appendSectionLabel(ownerDocument, menu, messages.textWrappingSection);
  const wrapGrid = createGrid(ownerDocument);
  for (const choice of layoutChoices.slice(1)) {
    appendLayoutChoice(
      ownerDocument,
      wrapGrid,
      choice,
      messages,
      current,
      onChange
    );
  }
  menu.append(wrapGrid);

  const divider = ownerDocument.createElement("div");
  divider.style.height = "1px";
  divider.style.background = "rgba(100, 116, 139, 0.16)";
  divider.style.margin = "4px 2px";
  menu.append(divider);

  appendMovementChoice(
    ownerDocument,
    menu,
    "move-with-text",
    messages.moveWithText,
    current,
    onChange
  );
  appendMovementChoice(
    ownerDocument,
    menu,
    "fixed-on-page",
    messages.fixedOnPage,
    current,
    onChange
  );
  return menu;
}

/**
 * Resolves the visible layout preset from orthogonal canonical attributes.
 *
 * @param attrs - Current canonical anchor attributes.
 * @returns Exactly one selected menu preset.
 */
export function resolveDrawingLayoutPreset(
  attrs: DrawingAnchor
): DrawingLayoutPreset {
  if (attrs.layoutMode === "inline") return "inline";
  if (attrs.paintOrder === "behind-text") return "behind-text";
  if (attrs.wrap.mode !== "none") return attrs.wrap.mode;
  return "in-front-of-text";
}

/**
 * Converts one UI preset into orthogonal model fields.
 *
 * @param preset - Selected user-facing layout preset.
 * @returns Canonical mutable anchor patch.
 */
export function createDrawingLayoutPresetPatch(
  preset: DrawingLayoutPreset
): DrawingAnchorPatch {
  if (preset === "inline") {
    return {
      layoutMode: "inline",
      wrap: { mode: "none" },
      paintOrder: "in-front-of-text"
    };
  }
  if (preset === "behind-text" || preset === "in-front-of-text") {
    return {
      layoutMode: "anchored",
      wrap: { mode: "none" },
      paintOrder: preset
    };
  }
  return {
    layoutMode: "anchored",
    wrap: { mode: preset },
    paintOrder: "in-front-of-text"
  };
}

/**
 * Creates one three-column preset grid.
 *
 * @param ownerDocument - Document creating the grid.
 * @returns Styled layout grid.
 */
function createGrid(ownerDocument: Document): HTMLElement {
  const grid = ownerDocument.createElement("div");
  applyDrawingLayoutGridStyle(grid);
  return grid;
}

/**
 * Appends one section heading.
 *
 * @param ownerDocument - Document creating the heading.
 * @param menu - Menu receiving the heading.
 * @param label - Visible section label.
 */
function appendSectionLabel(
  ownerDocument: Document,
  menu: HTMLElement,
  label: string
): void {
  const heading = ownerDocument.createElement("div");
  heading.textContent = label;
  applyDrawingLayoutSectionLabelStyle(heading);
  menu.append(heading);
}

/**
 * Appends one icon-like layout preset choice.
 *
 * @param ownerDocument - Document creating the control.
 * @param grid - Grid receiving the control.
 * @param preset - Stable layout preset.
 * @param messages - Localized drawing menu copy.
 * @param current - Current anchor state.
 * @param onChange - Semantic patch callback.
 */
function appendLayoutChoice(
  ownerDocument: Document,
  grid: HTMLElement,
  preset: DrawingLayoutPreset,
  messages: DrawingContextualMessages,
  current: DrawingAnchor,
  onChange: (patch: DrawingAnchorPatch) => boolean
): void {
  const label = resolveLayoutPresetLabel(preset, messages);
  const selected = resolveDrawingLayoutPreset(current) === preset;
  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitemradio");
  button.setAttribute("aria-checked", String(selected));
  button.setAttribute("aria-label", label);
  button.title = label;
  button.dataset.qkDrawingLayoutPreset = preset;
  button.append(createLayoutPreview(ownerDocument, preset));
  applyDrawingLayoutChoiceStyle(button, selected);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selected) {
      onChange(createDrawingLayoutPresetPatch(preset));
    }
  });
  grid.append(button);
}

/**
 * Appends one anchored movement radio row.
 *
 * @param ownerDocument - Document creating the row.
 * @param menu - Menu receiving the row.
 * @param movement - Canonical movement value.
 * @param label - Visible row label.
 * @param current - Current anchor state.
 * @param onChange - Semantic patch callback.
 */
function appendMovementChoice(
  ownerDocument: Document,
  menu: HTMLElement,
  movement: DrawingAnchorMovement,
  label: string,
  current: DrawingAnchor,
  onChange: (patch: DrawingAnchorPatch) => boolean
): void {
  const button = ownerDocument.createElement("button");
  const checked = current.anchorMovement === movement;
  button.type = "button";
  button.setAttribute("role", "menuitemradio");
  button.setAttribute("aria-checked", String(checked));
  button.dataset.qkDrawingAnchorMovement = movement;
  button.disabled = current.layoutMode === "inline";
  button.append(`${checked ? "◉" : "○"} ${label}`);
  applyDrawingPaintOrderItemStyle(button, checked);
  if (button.disabled) button.style.opacity = "0.42";
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!button.disabled && !checked) {
      onChange({ anchorMovement: movement });
    }
  });
  menu.append(button);
}

/**
 * Resolves one stable layout preset to mounted-product copy.
 *
 * @param preset - Canonical layout preset.
 * @param messages - Localized drawing menu copy.
 * @returns Visible and accessible preset label.
 */
function resolveLayoutPresetLabel(
  preset: DrawingLayoutPreset,
  messages: DrawingContextualMessages
): string {
  switch (preset) {
    case "inline":
      return messages.inline;
    case "square":
      return messages.square;
    case "tight":
      return messages.tight;
    case "through":
      return messages.through;
    case "top-and-bottom":
      return messages.topAndBottom;
    case "behind-text":
      return messages.behindText;
    case "in-front-of-text":
      return messages.inFrontOfText;
  }
}

/**
 * Creates compact line/object artwork for one layout preset.
 *
 * @param ownerDocument - Document creating SVG nodes.
 * @param preset - Preset represented by the artwork.
 * @returns Current-color thumbnail.
 */
function createLayoutPreview(
  ownerDocument: Document,
  preset: DrawingLayoutPreset
): SVGSVGElement {
  const svg = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 44 34");
  svg.setAttribute("width", "44");
  svg.setAttribute("height", "34");
  svg.setAttribute("aria-hidden", "true");
  const lineYs = preset === "top-and-bottom" ? [4, 9, 25, 30] : [5, 10, 17, 24, 29];
  for (const y of lineYs) {
    const line = ownerDocument.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", "3");
    line.setAttribute("x2", "41");
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("opacity", preset === "behind-text" ? "0.9" : "0.72");
    svg.append(line);
  }
  const object = ownerDocument.createElementNS(svg.namespaceURI, "rect");
  object.setAttribute("x", preset === "inline" ? "12" : "15");
  object.setAttribute("y", preset === "inline" ? "13" : "11");
  object.setAttribute("width", "14");
  object.setAttribute("height", "12");
  object.setAttribute("rx", preset === "tight" || preset === "through" ? "4" : "1");
  object.setAttribute("fill", preset === "behind-text" ? "rgba(37, 99, 235, 0.28)" : "rgb(37, 99, 235)");
  object.setAttribute("stroke", "rgb(37, 99, 235)");
  svg.append(object);
  return svg;
}
