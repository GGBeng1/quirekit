import { applyDrawingCommandCardStyle } from "./card-style";
import { resolveDrawingContextualMessages } from "./copy";
import { createDrawingCardActionButton, createDrawingCardCommandButton } from "./controls";
import { createDrawingCommandMenuController } from "./menu-controller";
import { createDrawingCommandTooltipController } from "./tooltip";
import type { CreateDrawingCommandCardOptions, DrawingCommandCardController } from "./types";
import { createDrawingLayoutMenu } from "../layout-menu";
import { createProductDrawingToolbar } from "./product-toolbar";
import { createNativeDrawingAppearance } from "./native-appearance";

/**
 * Creates selected-object chrome whose product appearance controls survive refresh.
 * @param ownerDocument - Document that owns the mounted overlay host.
 * @param initial - Accepted geometry, source state, and real command callbacks.
 * @returns Card with explicit update and deterministic listener cleanup.
 */
export function createDrawingCommandCard(
  ownerDocument: Document,
  initial: CreateDrawingCommandCardOptions
): DrawingCommandCardController {
  if (initial.toolbarRenderer) return createProductDrawingToolbar(ownerDocument, initial, initial.toolbarRenderer);
  let options = initial;
  let destroyed = false;
  const toolbar = ownerDocument.createElement("div");
  toolbar.dataset.qkDrawingContextualCommands = "true";
  // Product controls own pointer input; bubbling into the document would replace
  // the exact NodeSelection before the popup can apply an appearance command.
  toolbar.addEventListener("pointerdown", event => event.stopPropagation());
  applyDrawingCommandCardStyle(toolbar, options.rect);
  const menus = createDrawingCommandMenuController(ownerDocument, toolbar,
    command => options.onOpenMenuChange(command));
  const tooltips = createDrawingCommandTooltipController(ownerDocument, toolbar);
  const layout = createDrawingCardCommandButton(ownerDocument, options.locale, "layout", "wrap");
  layout.style.width = "38px";
  layout.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    menus.toggle("layout", layout, createLayoutMenu);
  });
  toolbar.append(layout);

  const native = createNativeDrawingAppearance(ownerDocument, toolbar, menus, () => options);
  if (options.hasTextStory) toolbar.append(createDrawingCardActionButton(
    ownerDocument, options.locale, "edit-text", "edit-text",
    () => options.onEnterText(), destroy, false
  ));
  toolbar.append(createDrawingCardActionButton(
    ownerDocument, options.locale, "delete", "delete",
    () => options.onDelete(), destroy
  ));

  /** Releases card chrome and its document-level dismissal listeners. */
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    tooltips.destroy();
    menus.destroy();
    toolbar.remove();
  }

  return {
    element: toolbar,
    /** @param next - Same-object facts projected after a retained-layout refresh. */
    update(next): void {
      options = next;
      applyDrawingCommandCardStyle(toolbar, options.rect);
    },
    /** @param command - Native menu restored after canonical state changes. */
    openMenu(command): void {
      if (command === "layout") menus.open(command, layout, createLayoutMenu, false);
      else native?.open(command);
    },
    destroy
  };

  /** @returns Layout menu projected from the current canonical attributes. */
  function createLayoutMenu(): HTMLElement {
    return createDrawingLayoutMenu(ownerDocument, options.attrs,
      resolveDrawingContextualMessages(options.locale), options.onAttrsChange);
  }
}
