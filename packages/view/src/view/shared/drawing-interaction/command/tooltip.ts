import { applyDrawingCommandTooltipStyle } from "./card-style";
import type { DrawingCommandTooltipController } from "./types";

const tooltipDelayMs = 420;
let tooltipSequence = 0;

/**
 * Creates one shared delayed-hover and immediate-focus tooltip for a command card.
 *
 * @param ownerDocument - Document owning the toolbar and tooltip portal.
 * @param toolbar - Command card whose semantic buttons request feedback.
 * @returns Deterministic tooltip lifecycle.
 */
export function createDrawingCommandTooltipController(
  ownerDocument: Document,
  toolbar: HTMLElement
): DrawingCommandTooltipController {
  const tooltip = ownerDocument.createElement("div");
  const tooltipId = `qk-drawing-command-tooltip-${tooltipSequence += 1}`;
  let hoverTarget: HTMLButtonElement | null = null;
  let focusTarget: HTMLButtonElement | null = null;
  let describedTarget: HTMLButtonElement | null = null;
  let showTimer: number | undefined;
  let destroyed = false;
  tooltip.id = tooltipId;
  tooltip.dataset.qkDrawingTooltipSurface = "true";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  applyDrawingCommandTooltipStyle(tooltip);

  /** Clears a scheduled pointer-hover reveal. */
  const clearScheduledShow = (): void => {
    if (showTimer === undefined) {
      return;
    }
    ownerDocument.defaultView?.clearTimeout(showTimer);
    showTimer = undefined;
  };

  /** Hides visible feedback and releases its accessibility relationship. */
  const hide = (): void => {
    clearScheduledShow();
    describedTarget?.removeAttribute("aria-describedby");
    describedTarget = null;
    tooltip.hidden = true;
    tooltip.textContent = "";
  };

  /**
   * Positions and reveals feedback for one semantic command.
   *
   * @param target - Command button owning localized tooltip copy.
   */
  const show = (target: HTMLButtonElement): void => {
    if (destroyed || !toolbar.contains(target)) {
      return;
    }
    const copy = target.dataset.qkDrawingTooltip;
    if (copy === undefined || copy.length === 0) {
      hide();
      return;
    }
    hide();
    tooltip.textContent = copy;
    if (!tooltip.isConnected) {
      ownerDocument.body.append(tooltip);
    }
    tooltip.hidden = false;
    target.setAttribute("aria-describedby", tooltipId);
    describedTarget = target;
    positionTooltip(ownerDocument, tooltip, target);
  };

  /**
   * Schedules delayed feedback for a pointer-owned command.
   *
   * @param target - Command button beneath the pointer.
   */
  const schedule = (target: HTMLButtonElement): void => {
    clearScheduledShow();
    const view = ownerDocument.defaultView;
    if (view === null) {
      show(target);
      return;
    }
    showTimer = view.setTimeout(() => {
      showTimer = undefined;
      if (hoverTarget === target && focusTarget === null) {
        show(target);
      }
    }, tooltipDelayMs);
  };

  /** Starts delayed feedback when the pointer enters a semantic command. */
  const handlePointerOver = (event: Event): void => {
    const target = resolveDrawingCommandButton(toolbar, event.target);
    if (target === null || target === hoverTarget) {
      return;
    }
    hoverTarget = target;
    if (focusTarget === null) {
      schedule(target);
    }
  };

  /** Closes hover feedback when the pointer leaves its semantic command. */
  const handlePointerOut = (event: Event): void => {
    const target = resolveDrawingCommandButton(toolbar, event.target);
    const related = event instanceof MouseEvent ? event.relatedTarget : null;
    if (
      target === null
      || (related instanceof Node && target.contains(related))
    ) {
      return;
    }
    if (hoverTarget === target) {
      hoverTarget = null;
    }
    if (focusTarget === null) {
      hide();
    }
  };

  /** Shows immediate feedback for keyboard focus. */
  const handleFocusIn = (event: FocusEvent): void => {
    const target = resolveDrawingCommandButton(toolbar, event.target);
    if (target === null) {
      return;
    }
    focusTarget = target;
    show(target);
  };

  /** Restores pointer feedback or hides after keyboard focus leaves. */
  const handleFocusOut = (event: FocusEvent): void => {
    const target = resolveDrawingCommandButton(toolbar, event.target);
    if (target !== null && focusTarget === target) {
      focusTarget = null;
    }
    if (hoverTarget === null) {
      hide();
    } else {
      schedule(hoverTarget);
    }
  };

  /** Hides feedback before a command or menu consumes pointer down. */
  const handlePointerDown = (): void => {
    hoverTarget = null;
    focusTarget = null;
    hide();
  };

  toolbar.addEventListener("pointerover", handlePointerOver);
  toolbar.addEventListener("pointerout", handlePointerOut);
  toolbar.addEventListener("focusin", handleFocusIn);
  toolbar.addEventListener("focusout", handleFocusOut);
  toolbar.addEventListener("pointerdown", handlePointerDown, true);

  return {
    dismiss(): void {
      hoverTarget = null;
      focusTarget = null;
      hide();
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      hide();
      toolbar.removeEventListener("pointerover", handlePointerOver);
      toolbar.removeEventListener("pointerout", handlePointerOut);
      toolbar.removeEventListener("focusin", handleFocusIn);
      toolbar.removeEventListener("focusout", handleFocusOut);
      toolbar.removeEventListener("pointerdown", handlePointerDown, true);
      tooltip.remove();
    }
  };
}

/**
 * Resolves a semantic command button from delegated event ownership.
 *
 * @param toolbar - Command card limiting event ownership.
 * @param eventTarget - Raw browser event target.
 * @returns Owning semantic command button, or null.
 */
function resolveDrawingCommandButton(
  toolbar: HTMLElement,
  eventTarget: EventTarget | null
): HTMLButtonElement | null {
  if (!(eventTarget instanceof Element)) {
    return null;
  }
  const button = eventTarget.closest<HTMLButtonElement>("[data-qk-drawing-command]");
  return button !== null && button.parentElement === toolbar ? button : null;
}

/**
 * Positions one fixed tooltip below its command while clamping to the viewport.
 *
 * @param ownerDocument - Document supplying viewport geometry.
 * @param tooltip - Visible tooltip whose width is now measurable.
 * @param target - Command button anchoring the tooltip.
 */
function positionTooltip(
  ownerDocument: Document,
  tooltip: HTMLElement,
  target: HTMLButtonElement
): void {
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = ownerDocument.documentElement.clientWidth;
  const halfWidth = tooltipRect.width / 2;
  const center = targetRect.left + targetRect.width / 2;
  const left = viewportWidth <= 0
    ? center
    : Math.min(
      Math.max(8 + halfWidth, center),
      Math.max(8 + halfWidth, viewportWidth - 8 - halfWidth)
    );
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${targetRect.bottom + 8}px`;
}
