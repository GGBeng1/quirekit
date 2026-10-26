import type { DrawingAnchor, DrawingAnchorPatch, DrawingStroke } from "@quirekit/drawing-geometry";
import {
  createDrawingStrokeDashPatch,
  createDrawingStrokeWidthPatch
} from "./patches";
import {
  applyDrawingAppearanceChoiceRowStyle,
  applyDrawingAppearanceChoiceStyle,
  applyDrawingAppearanceSectionLabelStyle
} from "./menu-style";
import type { DrawingContextualMessages } from "../command/types";

const outlineWidths = [1, 2, 3, 4, 6] as const;

/**
 * Appends outline width and dash radio groups.
 *
 * @param ownerDocument - Document creating controls.
 * @param menu - Outline menu receiving controls.
 * @param current - Live canonical selected-anchor attrs.
 * @param messages - Localized drawing menu copy.
 * @param onChange - Exact-anchor Word command callback.
 */
export function appendDrawingOutlineChoices(
  ownerDocument: Document,
  menu: HTMLElement,
  current: DrawingAnchor,
  messages: DrawingContextualMessages,
  onChange: (patch: DrawingAnchorPatch) => boolean
): void {
  const outlineDashes = [
    ["solid", messages.solid],
    ["dash", messages.dashLine],
    ["dot", messages.dot],
    ["dash-dot", messages.dashDot]
  ] as const satisfies readonly (
    readonly [DrawingStroke["dash"], string]
  )[];
  appendChoiceSection(ownerDocument, menu, messages.width, outlineWidths.map((width) => ({
    value: String(width),
    label: `${width} pt`,
    selected: current.drawing.appearance.stroke.kind === "solid"
      && current.drawing.appearance.stroke.width === width,
    patch: createDrawingStrokeWidthPatch(current, width)
  })), "outline-width", onChange);
  appendChoiceSection(ownerDocument, menu, messages.dash, outlineDashes.map(([dash, label]) => ({
    value: dash,
    label,
    selected: current.drawing.appearance.stroke.kind === "solid"
      && current.drawing.appearance.stroke.dash === dash,
    patch: createDrawingStrokeDashPatch(current, dash)
  })), "outline-dash", onChange);
}

/**
 * Appends one labelled radio-like outline property row.
 *
 * @param ownerDocument - Document creating controls.
 * @param menu - Menu receiving the section.
 * @param label - Visible section label.
 * @param choices - Stable values, labels, states, and canonical patches.
 * @param datasetName - Stable data attribute suffix.
 * @param onChange - Exact-anchor Word command callback.
 */
function appendChoiceSection(
  ownerDocument: Document,
  menu: HTMLElement,
  label: string,
  choices: readonly Readonly<{
    value: string;
    label: string;
    selected: boolean;
    patch: DrawingAnchorPatch;
  }>[],
  datasetName: "outline-width" | "outline-dash",
  onChange: (patch: DrawingAnchorPatch) => boolean
): void {
  const heading = ownerDocument.createElement("div");
  heading.textContent = label;
  applyDrawingAppearanceSectionLabelStyle(heading);
  menu.append(heading);
  const row = ownerDocument.createElement("div");
  applyDrawingAppearanceChoiceRowStyle(row);
  for (const choice of choices) {
    const button = ownerDocument.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitemradio");
    button.setAttribute("aria-checked", String(choice.selected));
    button.setAttribute(`data-qk-drawing-${datasetName}`, choice.value);
    button.textContent = choice.label;
    applyDrawingAppearanceChoiceStyle(button, choice.selected);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!choice.selected) {
        onChange(choice.patch);
      }
    });
    row.append(button);
  }
  menu.append(row);
}
