import {
  createQuireColorPalette,
  createQuireCustomColorPanel
} from "@quirekit/ui";
import { positionDrawingCustomColorPanel } from "./custom-color-position";
import { drawingMenuPositionEvent } from "../command/menu-events";
import type { DrawingContextualMessages } from "../command/types";

/**
 * Appends the shared document color palette and custom-color surface.
 *
 * @param ownerDocument - Document creating menu controls.
 * @param menu - Menu receiving the shared palette.
 * @param paintKind - Fill or outline dataset namespace.
 * @param selectedColor - Current solid color, or null.
 * @param messages - Localized drawing menu copy.
 * @param onReset - Callback applying explicit no paint.
 * @param onSelect - Callback receiving one authored color.
 * @param customColorOpen - Whether the secondary custom-color surface is open.
 * @param onCustomColorOpenChange - Callback retaining secondary-surface state.
 */
export function appendDrawingColorPalette(
  ownerDocument: Document,
  menu: HTMLElement,
  paintKind: "fill" | "outline",
  selectedColor: string | null,
  messages: DrawingContextualMessages,
  onReset: () => void,
  onSelect: (color: string) => void,
  customColorOpen: boolean,
  onCustomColorOpenChange: (open: boolean) => void
): void {
  const label = paintKind === "fill"
    ? messages.shapeFill
    : messages.shapeOutline;
  const palette = createQuireColorPalette({
    ownerDocument,
    value: selectedColor,
    defaultColor: null,
    recentColors: [],
    labels: {
      label,
      defaultColor: paintKind === "fill"
        ? messages.noFill
        : messages.noOutline,
      moreColors: messages.moreColors,
      recentColors: messages.recentColors
    },
    onReset,
    onSelect,
    onMoreColors: toggleCustomColorPanel
  });
  const customPanel = createQuireCustomColorPanel({
    ownerDocument,
    value: selectedColor ?? "#000000",
    label: messages.moreColors,
    onChange: onSelect
  });
  customPanel.element.dataset.qkDrawingCustomColorPanel = paintKind;
  customPanel.element.style.position = "absolute";
  customPanel.element.style.zIndex = "1";
  customPanel.element.hidden = !customColorOpen;
  menu.addEventListener(drawingMenuPositionEvent, positionCustomColorPanel);
  decorateDrawingPalette(palette.element, paintKind);
  menu.append(palette.element, customPanel.element);

  /** Toggles the consumer-positioned secondary color surface. */
  function toggleCustomColorPanel(): void {
    const open = customPanel.element.hidden === true;
    customPanel.element.hidden = !open;
    onCustomColorOpenChange(open);
    if (open) {
      positionCustomColorPanel();
    }
  }

  /** Repositions the visible secondary surface after primary-menu movement. */
  function positionCustomColorPanel(): void {
    if (!customPanel.element.hidden) {
      positionDrawingCustomColorPanel(menu, customPanel.element, ownerDocument);
    }
  }
}

/**
 * Adds drawing-specific stable automation attributes to shared color controls.
 *
 * @param palette - Shared palette root.
 * @param paintKind - Drawing appearance member using the palette.
 */
function decorateDrawingPalette(
  palette: HTMLElement,
  paintKind: "fill" | "outline"
): void {
  palette.dataset.qkDrawingColorPalette = paintKind;
  palette.querySelector("[data-qk-color-default]")?.setAttribute(
    `data-qk-drawing-${paintKind}-none`,
    "true"
  );
  for (const button of palette.querySelectorAll<HTMLElement>(
    "[data-qk-color-value]"
  )) {
    const color = button.dataset.qkColorValue;
    if (color !== undefined) {
      button.setAttribute(`data-qk-drawing-${paintKind}-color`, color);
    }
  }
}
