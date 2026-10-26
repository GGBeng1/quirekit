import { createDrawingFillMenu, createDrawingOutlineMenu } from "../appearance";
import { createDrawingCardCommandButton, resolveDrawingCommandPaintIndicator } from "./controls";
import { resolveDrawingContextualMessages } from "./copy";
import type { createDrawingCommandMenuController } from "./menu-controller";
import type { CreateDrawingCommandCardOptions, DrawingCustomColorCommandId } from "./types";

/**
 * Keeps framework-independent controls available to standalone View consumers.
 * @param document - Card's owning document.
 * @param toolbar - Native command card receiving the two appearance buttons.
 * @param menus - Native menu lifetime.
 * @param read - Current exact-anchor facts and commands.
 * @returns Retained native-menu restoration operation.
 */
export function createNativeDrawingAppearance(
  document: Document,
  toolbar: HTMLElement,
  menus: ReturnType<typeof createDrawingCommandMenuController>,
  read: () => CreateDrawingCommandCardOptions
) {
  const buttons = {} as Record<DrawingCustomColorCommandId, HTMLButtonElement>;
  for (const command of ["fill", "outline"] as const) {
    const options = read();
    const paint = command === "fill" ? options.attrs.drawing.appearance.fill : options.attrs.drawing.appearance.stroke;
    const button = createDrawingCardCommandButton(document, options.locale, command, command,
      resolveDrawingCommandPaintIndicator(paint));
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      menus.toggle(command, button, () => createMenu(command));
    });
    buttons[command] = button;
    toolbar.append(button);
  }
  return {
    /** @param command - Native appearance menu to restore. */
    open(command: DrawingCustomColorCommandId): void {
      menus.open(command, buttons[command], () => createMenu(command), false);
    }
  };

  /** @param command - Current appearance family. @returns Canonical native menu. */
  function createMenu(command: DrawingCustomColorCommandId): HTMLElement {
    const options = read();
    const create = command === "fill" ? createDrawingFillMenu : createDrawingOutlineMenu;
    return create(document, options.attrs, resolveDrawingContextualMessages(options.locale),
      options.onAttrsChange, options.openCustomColorCommand === command,
      open => options.onCustomColorOpenChange(open ? command : null));
  }
}
