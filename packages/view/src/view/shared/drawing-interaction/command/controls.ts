import { createDrawingCommandButton } from "./button";
import { resolveDrawingContextualCommandLabel } from "./copy";
import type {
  DrawingCommandPaintIndicator,
  DrawingContextualCommandIcon,
  DrawingContextualCommandId,
  DrawingContextualCommandLocale
} from "./types";

/**
 * Resolves one canonical drawing paint to its compact toolbar indicator.
 *
 * @param paint - Canonical paint kind and optional color.
 * @returns Solid current color or an explicit no-paint state.
 */
export function resolveDrawingCommandPaintIndicator(
  paint: Readonly<{
    kind: string;
    color?: string | null;
  }>
): DrawingCommandPaintIndicator {
  return paint.kind === "solid" && paint.color != null
    ? { kind: "solid", color: paint.color }
    : { kind: "none" };
}

/**
 * Creates an icon-only contextual button without attaching command behavior.
 *
 * @param ownerDocument - Document creating the button.
 * @param locale - Mounted product language.
 * @param command - Stable semantic command id.
 * @param icon - Compact visible artwork.
 * @param paintIndicator - Optional live fill or outline state.
 * @returns Styled contextual button.
 */
export function createDrawingCardCommandButton(
  ownerDocument: Document,
  locale: DrawingContextualCommandLocale,
  command: DrawingContextualCommandId,
  icon: DrawingContextualCommandIcon,
  paintIndicator?: DrawingCommandPaintIndicator
): HTMLButtonElement {
  const label = resolveDrawingContextualCommandLabel(
    locale,
    command,
    paintIndicator
  );
  return createDrawingCommandButton(ownerDocument, {
    id: command,
    label,
    icon,
    paintIndicator
  });
}

/**
 * Creates one command button that removes chrome after a successful action.
 *
 * @param ownerDocument - Document creating the button.
 * @param locale - Mounted product language.
 * @param command - Stable semantic command id.
 * @param icon - Compact visible artwork.
 * @param action - Real editor command callback.
 * @param removeCard - Chrome teardown after a successful transition.
 * @param removeOnSuccess - Whether the action ends the selected-object context.
 * @returns Pointer-safe action button.
 */
export function createDrawingCardActionButton(
  ownerDocument: Document,
  locale: DrawingContextualCommandLocale,
  command: DrawingContextualCommandId,
  icon: DrawingContextualCommandIcon,
  action: () => boolean,
  removeCard: () => void,
  removeOnSuccess = true
): HTMLButtonElement {
  const button = createDrawingCardCommandButton(
    ownerDocument,
    locale,
    command,
    icon
  );
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (action() && removeOnSuccess) {
      removeCard();
    }
  });
  return button;
}
