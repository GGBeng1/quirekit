import type {
  QuireHeaderFooterToolbarController,
  QuireHeaderFooterToolbarState
} from "./types";

/**
 * Creates the framework-free default toolbar used when no product renderer exists.
 *
 * @param ownerDocument - Document owning the editing chrome.
 * @param initial - Initial session facts and intents.
 * @returns Token-styled toolbar with update and disposal lifetimes.
 */
export function createDefaultHeaderFooterToolbar(
  ownerDocument: Document,
  initial: QuireHeaderFooterToolbarState
): QuireHeaderFooterToolbarController {
  let state = initial;
  const element = ownerDocument.createElement("div");
  const caption = ownerDocument.createElement("span");
  const value = ownerDocument.createElement("output");
  const decrement = createButton(ownerDocument, "−", () => state.onDistanceStep(-1));
  const increment = createButton(ownerDocument, "+", () => state.onDistanceStep(1));
  const separator = ownerDocument.createElement("span");
  const close = createButton(ownerDocument, "", () => state.onClose());

  element.setAttribute("role", "toolbar");
  applyToolbarStyle(element);
  caption.style.padding = "0 4px 0 6px";
  caption.style.color = "var(--qk-color-text-secondary, rgb(71, 85, 105))";
  value.dataset.qkHeaderFooterDistanceValue = initial.region;
  value.style.minWidth = "56px";
  value.style.textAlign = "center";
  value.style.fontVariantNumeric = "tabular-nums";
  value.style.color = "var(--qk-color-text-primary, rgb(15, 23, 42))";
  decrement.style.width = increment.style.width = "24px";
  separator.setAttribute("aria-hidden", "true");
  separator.style.width = "1px";
  separator.style.height = "16px";
  separator.style.margin = "0 4px";
  separator.style.background = "var(--qk-color-border-subtle, rgba(100, 116, 139, 0.24))";
  close.dataset.qkHeaderFooterExit = initial.region;
  close.style.padding = "0 8px";

  /** Projects the latest copy and distance availability. */
  const render = (): void => {
    const { messages } = state;
    element.setAttribute("aria-label", messages.toolbarLabel);
    caption.textContent = messages.distanceLabel;
    value.value = state.distanceText ?? "";
    decrement.setAttribute("aria-label", messages.decreaseDistance);
    increment.setAttribute("aria-label", messages.increaseDistance);
    close.textContent = messages.close;
    close.setAttribute("aria-label", messages.closeLabel);
    close.title = messages.closeTooltip;
    const distance = state.distanceText !== null;
    for (const node of [caption, decrement, value, increment, separator]) {
      node.style.display = distance ? "" : "none";
    }
  };

  render();
  element.append(caption, decrement, value, increment, separator, close);
  return {
    element,
    update(next): void {
      state = next;
      render();
    },
    destroy(): void {
      element.remove();
    }
  };
}

/**
 * Creates one compact toolbar button.
 *
 * @param ownerDocument - Document owning the button.
 * @param text - Visible glyph or label.
 * @param action - Intent invoked on click.
 * @returns Token-styled button.
 */
function createButton(
  ownerDocument: Document,
  text: string,
  action: () => unknown
): HTMLButtonElement {
  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.style.height = "24px";
  button.style.padding = "0";
  button.style.border = "0";
  button.style.borderRadius = "var(--qk-radius-control, 4px)";
  button.style.background = "transparent";
  button.style.color = "var(--qk-color-text-primary, rgb(15, 23, 42))";
  button.style.font = "inherit";
  button.style.cursor = "pointer";
  button.addEventListener("pointerenter", () => {
    button.style.background = "var(--qk-color-surface-hover, rgba(100, 116, 139, 0.12))";
  });
  button.addEventListener("pointerleave", () => {
    button.style.background = "transparent";
  });
  // Keep editor focus: the default bar never needs keyboard input of its own.
  button.addEventListener("pointerdown", (event) => event.preventDefault());
  button.addEventListener("click", () => action());
  return button;
}

/**
 * Applies the elevated surface shared with other mounted contextual chrome.
 *
 * @param element - Toolbar root.
 */
function applyToolbarStyle(element: HTMLElement): void {
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.gap = "2px";
  element.style.padding = "4px";
  element.style.border = "1px solid var(--qk-color-border-subtle, rgba(100, 116, 139, 0.24))";
  element.style.borderRadius = "var(--qk-radius-overlay, 8px)";
  element.style.background = "var(--qk-color-surface-overlay, #ffffff)";
  element.style.boxShadow = "var(--qk-elevation-overlay, 0 6px 20px rgba(15, 23, 42, 0.16))";
  element.style.font = "var(--qk-type-compact-font-weight, 400) var(--qk-type-compact-font-size, 13px)/1.5 var(--qk-type-compact-font-family, system-ui, sans-serif)";
  element.style.whiteSpace = "nowrap";
}
