/**
 * Resolves whether a pointerdown should start mounted text selection.
 *
 * Secondary buttons are reserved for context-menu input. Ctrl-click on mouse
 * devices on Apple platforms remains a secondary gesture; other platforms let
 * modifier-aware plugin actions run. Unknown hosts retain the menu policy.
 *
 * @param event - Browser pointerdown event to classify.
 * @returns Whether the event should enter the selection pipeline.
 */
export function shouldStartMountedPointerSelection(event: PointerEvent): boolean {
  const button = typeof event.button === "number" ? event.button : 0;
  const platform = event.view?.navigator.platform;
  const appleMenu = platform === undefined || /Mac|iPhone|iPad|iPod/u.test(platform);
  return button === 0 && !(appleMenu && event.pointerType === "mouse" && event.ctrlKey === true);
}

/**
 * Suppresses the browser context menu for mounted editor surfaces.
 *
 * @param event - Browser contextmenu event to suppress.
 */
export function preventMountedContextMenu(event: Event): void {
  event.preventDefault();
}
