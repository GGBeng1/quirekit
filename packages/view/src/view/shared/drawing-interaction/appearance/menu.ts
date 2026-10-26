import type { DrawingAnchor, DrawingAnchorPatch } from "@quirekit/drawing-geometry";
import {
  createDrawingFillColorPatch,
  createDrawingStrokeColorPatch
} from "./patches";
import {
  applyDrawingAppearanceMenuStyle
} from "./menu-style";
import { appendDrawingColorPalette } from "./color-palette";
import { appendDrawingOutlineChoices } from "./outline-options";
import type { DrawingContextualMessages } from "../command/types";

/**
 * Creates the selected drawing fill menu.
 *
 * @param ownerDocument - Document creating the menu.
 * @param current - Live canonical selected-anchor attrs.
 * @param messages - Localized drawing menu copy.
 * @param onChange - Exact-anchor Word command callback.
 * @param customColorOpen - Whether the secondary fill-color surface is open.
 * @param onCustomColorOpenChange - Callback retaining secondary-surface state.
 * @returns Accessible fill menu.
 */
export function createDrawingFillMenu(
  ownerDocument: Document,
  current: DrawingAnchor,
  messages: DrawingContextualMessages,
  onChange: (patch: DrawingAnchorPatch) => boolean,
  customColorOpen = false,
  onCustomColorOpenChange: (open: boolean) => void = () => {}
): HTMLElement {
  const menu = createMenu(ownerDocument, messages.shapeFill, "fill");
  appendDrawingColorPalette(
    ownerDocument,
    menu,
    "fill",
    current.drawing.appearance.fill.color,
    messages,
    () => commitPatch(createDrawingFillColorPatch(current, null), onChange),
    (color) => commitPatch(
      createDrawingFillColorPatch(current, color),
      onChange
    ),
    customColorOpen,
    onCustomColorOpenChange
  );
  return menu;
}

/**
 * Creates the selected drawing outline menu.
 *
 * @param ownerDocument - Document creating the menu.
 * @param current - Live canonical selected-anchor attrs.
 * @param messages - Localized drawing menu copy.
 * @param onChange - Exact-anchor Word command callback.
 * @param customColorOpen - Whether the secondary outline-color surface is open.
 * @param onCustomColorOpenChange - Callback retaining secondary-surface state.
 * @returns Accessible outline menu.
 */
export function createDrawingOutlineMenu(
  ownerDocument: Document,
  current: DrawingAnchor,
  messages: DrawingContextualMessages,
  onChange: (patch: DrawingAnchorPatch) => boolean,
  customColorOpen = false,
  onCustomColorOpenChange: (open: boolean) => void = () => {}
): HTMLElement {
  const menu = createMenu(ownerDocument, messages.shapeOutline, "outline");
  const stroke = current.drawing.appearance.stroke;
  appendDrawingColorPalette(
    ownerDocument,
    menu,
    "outline",
    stroke.color,
    messages,
    () => commitPatch(createDrawingStrokeColorPatch(current, null), onChange),
    (color) => commitPatch(
      createDrawingStrokeColorPatch(current, color),
      onChange
    ),
    customColorOpen,
    onCustomColorOpenChange
  );
  appendDrawingOutlineChoices(
    ownerDocument,
    menu,
    current,
    messages,
    onChange
  );
  return menu;
}

/**
 * Creates one styled appearance menu root.
 *
 * @param ownerDocument - Document creating the root.
 * @param label - Accessible menu label.
 * @param kind - Stable appearance command owning the menu.
 * @returns Empty styled menu.
 */
function createMenu(
  ownerDocument: Document,
  label: string,
  kind: "fill" | "outline"
): HTMLElement {
  const menu = ownerDocument.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", label);
  menu.dataset.qkDrawingAppearanceMenu = kind;
  applyDrawingAppearanceMenuStyle(menu);
  return menu;
}

/**
 * Dispatches one canonical appearance patch.
 *
 * @param patch - Complete semantic appearance patch.
 * @param onChange - Exact-anchor Word command callback.
 */
function commitPatch(
  patch: DrawingAnchorPatch,
  onChange: (patch: DrawingAnchorPatch) => boolean
): void {
  onChange(patch);
}
