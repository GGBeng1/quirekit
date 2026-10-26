import type { DrawingContextualMenuCommandId } from "./types";
import { drawingMenuPositionEvent } from "./menu-events";

/**
 * Creates one mutually exclusive portalled menu lifetime for a command card.
 *
 * @param ownerDocument - Document owning the card and menu portal.
 * @param toolbar - Toolbar whose controls and pointer events retain ownership.
 * @param onOpenMenuChange - Reports user-authored open-menu state.
 * @returns Menu toggling, dismissal, and deterministic cleanup operations.
 */
export function createDrawingCommandMenuController(
  ownerDocument: Document,
  toolbar: HTMLElement,
  onOpenMenuChange: (command: DrawingContextualMenuCommandId | null) => void
) {
  let menu: HTMLElement | null = null;
  let source: HTMLButtonElement | null = null;
  let command: DrawingContextualMenuCommandId | null = null;
  let destroyed = false;

  /**
   * Removes the currently portalled selected-object menu.
   *
   * @param notify - Whether this close represents a user-visible state change.
   */
  const close = (notify = true): void => {
    const hadOpenMenu = command !== null;
    menu?.remove();
    menu = null;
    source = null;
    command = null;
    if (notify && hadOpenMenu) {
      onOpenMenuChange(null);
    }
  };

  /** Projects the menu beside the exact toolbar button that opened it. */
  const position = (): void => {
    if (menu === null || source === null) {
      return;
    }
    const sourceRect = source.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = ownerDocument.documentElement.clientWidth;
    const viewportHeight = ownerDocument.documentElement.clientHeight;
    const gap = 6;
    const preferredTop = sourceRect.bottom + gap;
    const top = preferredTop + menuRect.height <= viewportHeight - 8
      ? preferredTop
      : Math.max(8, sourceRect.top - menuRect.height - gap);
    const left = Math.min(
      Math.max(8, sourceRect.left),
      Math.max(8, viewportWidth - menuRect.width - 8)
    );
    menu.style.position = "fixed";
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.zIndex = "10000";
    const EventConstructor = ownerDocument.defaultView?.Event ?? Event;
    menu.dispatchEvent(new EventConstructor(drawingMenuPositionEvent));
  };

  /**
   * Toggles one menu and closes any menu opened from another command.
   *
   * @param nextCommand - Stable command owning the menu.
   * @param nextSource - Exact toolbar button anchoring the menu.
   * @param create - Factory for the current canonical menu contents.
   * @param notify - Whether to report the open state to the outer controller.
   */
  const open = (
    nextCommand: DrawingContextualMenuCommandId,
    nextSource: HTMLButtonElement,
    create: () => HTMLElement,
    notify = true
  ): void => {
    close(false);
    command = nextCommand;
    source = nextSource;
    menu = create();
    ownerDocument.body.append(menu);
    position();
    if (notify) {
      onOpenMenuChange(nextCommand);
    }
  };

  /**
   * Toggles one menu and closes any menu opened from another command.
   *
   * @param nextCommand - Stable command owning the menu.
   * @param nextSource - Exact toolbar button anchoring the menu.
   * @param create - Factory for the current canonical menu contents.
   */
  const toggle = (
    nextCommand: DrawingContextualMenuCommandId,
    nextSource: HTMLButtonElement,
    create: () => HTMLElement
  ): void => {
    if (command === nextCommand) {
      close();
      return;
    }
    open(nextCommand, nextSource, create);
  };

  /** Dismisses the menu without transferring selection to the document. */
  const handleOutsidePointerDown = (event: Event): void => {
    const target = event.target as Node | null;
    if (
      menu !== null
      && !toolbar.contains(target)
      && !menu.contains(target)
    ) {
      close();
    }
  };
  /** Gives an open menu first ownership of Escape. */
  const handleEscape = (event: KeyboardEvent): void => {
    if (menu === null || event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    close();
  };
  ownerDocument.addEventListener("pointerdown", handleOutsidePointerDown, true);
  ownerDocument.addEventListener("keydown", handleEscape, true);
  ownerDocument.addEventListener("scroll", position, true);
  ownerDocument.defaultView?.addEventListener("resize", position);

  return {
    close,
    open,
    toggle,
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      close(false);
      ownerDocument.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      ownerDocument.removeEventListener("keydown", handleEscape, true);
      ownerDocument.removeEventListener("scroll", position, true);
      ownerDocument.defaultView?.removeEventListener("resize", position);
    }
  };
}
