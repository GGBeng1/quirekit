import type { QuireMountedCaretMode } from "../types";
import { resolveMountedCaretPresentation } from "./presentation";
import { CaretBlinkTimer } from "./timer";
import type { MountedDomCaretOptions, MountedDomCaretPlacement } from "./types";

/** Media query under which a blinking caret stays steady instead. */
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/**
 * Owns the DOM caret element for one mounted editor view.
 *
 * The caret is a `pointer-events: none` element positioned in document coordinates
 * inside the document-spanning overlay layer, so it follows scroll natively. It sits
 * on its own compositing layer and blinks by flipping `visibility` on timer ticks:
 *
 * - `blink` while focused and editable: shown and blinking (steady under reduced motion).
 * - visible but not blinking (steady, or editable-but-unfocused): shown, no timer.
 * - hidden, read-only, or no caret geometry: not shown, no timer.
 */
export class MountedDomCaret {
  private readonly element: HTMLElement;
  private mode: QuireMountedCaretMode;
  private focused = false;
  private editable = true;
  private placementAvailable = false;
  private placementKey: string | undefined;
  private readonly blinkTimer = new CaretBlinkTimer();
  private blinkShown = true;
  private readonly reducedMotion: MediaQueryList | undefined;

  /**
   * Creates and mounts the DOM caret element.
   *
   * @param options - Owner document, host element, class name, and initial mode.
   */
  constructor(options: MountedDomCaretOptions) {
    this.mode = options.mode ?? "blink";
    this.reducedMotion = options.ownerDocument.defaultView?.matchMedia?.(reducedMotionQuery);
    this.element = options.ownerDocument.createElement("div");
    this.element.className = options.className;
    this.element.dataset.qkCaret = "";

    const style = this.element.style;
    style.position = "absolute";
    style.top = "0";
    style.left = "0";
    style.width = "2px";
    style.height = "0";
    style.pointerEvents = "none";
    style.zIndex = "3";
    style.display = "none";
    style.willChange = "opacity";

    options.host.appendChild(this.element);
    this.applyPresentation();
  }

  /**
   * Caret element owned by this controller.
   *
   * @returns DOM caret element.
   */
  get caretElement(): HTMLElement {
    return this.element;
  }

  /**
   * Current caret presentation mode.
   *
   * @returns Active caret mode.
   */
  get caretMode(): QuireMountedCaretMode {
    return this.mode;
  }

  /**
   * Changes the caret mode at runtime and reapplies presentation.
   *
   * @param mode - Caret mode to apply.
   */
  setMode(mode: QuireMountedCaretMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.applyPresentation();
  }

  /**
   * Updates caret presentation after a focus change.
   *
   * @param focused - Whether the mounted view owns keyboard focus.
   * @param editable - Whether the mounted view currently accepts editing input.
   */
  setFocused(focused: boolean, editable: boolean): void {
    this.focused = focused;
    this.editable = editable;
    this.applyPresentation();
  }

  /**
   * Positions the caret and applies presentation after a render pass.
   *
   * @param focused - Whether the mounted view owns keyboard focus.
   * @param editable - Whether the mounted view currently accepts editing input.
   * @param placement - Caret placement in document coordinates, or undefined when
   * the current selection has no caret to render.
   */
  syncAfterRender(
    focused: boolean,
    editable: boolean,
    placement: MountedDomCaretPlacement | undefined
  ): void {
    const previousPlacementKey = this.placementKey;

    this.focused = focused;
    this.editable = editable;
    this.placementAvailable = placement !== undefined;

    if (placement !== undefined) {
      this.position(placement);
      this.placementKey = createMountedDomCaretPlacementKey(placement);
    } else {
      this.placementKey = undefined;
    }

    this.applyPresentation(
      previousPlacementKey !== undefined && this.placementKey !== previousPlacementKey
    );
  }

  /** Stops blinking and removes the caret element from its host. */
  destroy(): void {
    this.blinkTimer.stop();
    this.element.remove();
  }

  /**
   * Writes the caret element position and color from a placement.
   *
   * @param placement - Caret placement in document coordinates.
   */
  private position(placement: MountedDomCaretPlacement): void {
    const style = this.element.style;

    setStyleValue(style, "left", `${placement.left}px`);
    setStyleValue(style, "top", `${placement.top}px`);
    setStyleValue(style, "width", `${placement.width}px`);
    setStyleValue(style, "height", `${placement.height}px`);
    setStyleValue(style, "backgroundColor", placement.color);
  }

  /**
   * Applies display and the blink timer from the current caret state.
   *
   * @param restartBlink - Whether a moved caret should restart from the shown
   * phase instead of preserving the running blink phase.
   */
  private applyPresentation(restartBlink = false): void {
    const presentation = resolveMountedCaretPresentation(
      this.mode,
      this.focused,
      this.editable
    );
    const style = this.element.style;
    const shown = presentation.visible && this.placementAvailable;

    if (!shown) {
      this.stopBlink();
      setStyleValue(style, "display", "none");
      this.element.dataset.qkCaretState = "hidden";
      return;
    }

    setStyleValue(style, "display", "block");

    if (presentation.blinking && this.reducedMotion?.matches !== true) {
      if (restartBlink || !this.blinkTimer.running) {
        this.startBlink();
      }

      this.element.dataset.qkCaretState = "blink";
      return;
    }

    this.stopBlink();
    this.element.dataset.qkCaretState = "steady";
  }

  /** Shows the caret and restarts the blink interval from the shown phase. */
  private startBlink(): void {
    this.setBlinkPhase(true);
    this.blinkTimer.start(() => {
      this.setBlinkPhase(!this.blinkShown);
    });
  }

  /** Stops blinking and leaves the caret in its shown phase. */
  private stopBlink(): void {
    this.blinkTimer.stop();
    this.setBlinkPhase(true);
  }

  /**
   * Writes the blink phase to the caret element.
   *
   * @param shown - Whether the caret bar is in its shown phase.
   */
  private setBlinkPhase(shown: boolean): void {
    this.blinkShown = shown;
    setStyleValue(this.element.style, "visibility", shown ? "visible" : "hidden");
  }
}

/**
 * Creates a stable key for detecting caret placement movement.
 *
 * @param placement - Caret placement to identify.
 * @returns Placement key containing geometry and color.
 */
function createMountedDomCaretPlacementKey(
  placement: MountedDomCaretPlacement
): string {
  return [
    placement.left,
    placement.top,
    placement.width,
    placement.height,
    placement.color
  ].join(":");
}

/**
 * Assigns a CSS value when it differs from the current inline style.
 *
 * @param style - Inline style declaration to update.
 * @param property - CSSStyleDeclaration property to write.
 * @param value - New CSS value.
 */
function setStyleValue(
  style: CSSStyleDeclaration,
  property:
    | "left"
    | "top"
    | "width"
    | "height"
    | "display"
    | "visibility"
    | "backgroundColor",
  value: string
): void {
  if (style[property] === value) {
    return;
  }

  style[property] = value;
}
