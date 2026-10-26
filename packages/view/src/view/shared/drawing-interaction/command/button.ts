import { applyDrawingCommandButtonStyle } from "./card-style";
import { createDrawingContextualCommandIcon } from "./icons";
import type {
  DrawingCommandPaintIndicator,
  DrawingContextualCommandIcon,
  DrawingContextualCommandId
} from "./types";

/** Presentation facts used to construct one contextual command button. */
interface CreateDrawingCommandButtonOptions {
  /** Stable semantic command id used by automation and event delegation. */
  readonly id: DrawingContextualCommandId;
  /** Localized accessible and tooltip copy. */
  readonly label: string;
  /** Lucide-style action artwork. */
  readonly icon: DrawingContextualCommandIcon;
  /** Optional live paint indicator for fill or outline. */
  readonly paintIndicator?: DrawingCommandPaintIndicator | undefined;
}

/**
 * Creates one styled icon-only command with stable semantics and localized copy.
 *
 * @param ownerDocument - Document creating the button.
 * @param options - Stable id, localized label, icon, and optional paint state.
 * @returns Contextual command button without command behavior.
 */
export function createDrawingCommandButton(
  ownerDocument: Document,
  options: CreateDrawingCommandButtonOptions
): HTMLButtonElement {
  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.dataset.qkDrawingCommand = options.id;
  button.dataset.qkDrawingTooltip = options.label;
  button.setAttribute("aria-label", options.label);
  button.append(createDrawingContextualCommandIcon(
    ownerDocument,
    options.icon,
    options.paintIndicator
  ));
  applyDrawingCommandButtonStyle(button);
  return button;
}
