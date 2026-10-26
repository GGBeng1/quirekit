import type { QuireMountedCaretMode } from "../types";
import { resolveMountedCaretPresentation } from "./presentation";
import { CaretBlinkTimer } from "./timer";
import type {
  MountedCaretBlinkOptions,
  MountedCaretSyncAfterRenderOptions
} from "./types";

/**
 * Owns the overlay-painted caret presentation for one mounted editor view.
 *
 * This is the overlay fallback (`caretRendering: "overlay"`): the caret lives in
 * the display list painted on each backend's overlay surface, and the blink is a
 * JS timer that toggles visibility and repaints the overlay. The DOM caret path
 * (`MountedDomCaret`) replaces this for the default rendering mode.
 *
 * The caret mode (`blink`, `steady`, `hidden`) plus the latest focus and
 * editability decide whether the caret paints and whether it blinks. In `blink`
 * mode the caret blinks while focused and editable, stays visible while editable
 * but unfocused, and hides in read-only/preview views.
 */
export class MountedCaretBlink {
  /** Whether caret commands should be visible in the next overlay repaint. */
  visible = true;
  private readonly options: MountedCaretBlinkOptions;
  private mode: QuireMountedCaretMode;
  private focused = false;
  private editable = true;
  private readonly timer = new CaretBlinkTimer();

  /**
   * Creates a caret blink lifecycle.
   *
   * @param options - Repaint callback and optional initial caret mode.
   */
  constructor(options: MountedCaretBlinkOptions) {
    this.options = options;
    this.mode = options.mode ?? "blink";
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
   * Changes the caret mode at runtime and repaints to reflect it.
   *
   * @param mode - Caret mode to apply.
   */
  setMode(mode: QuireMountedCaretMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.applyAfterStateChange();
  }

  /**
   * Synchronizes caret state after a render pass.
   *
   * A full render always paints the caret, so this only repaints when the caret
   * must be hidden for the current mode, focus, and editability.
   *
   * @param focused - Whether the mounted view owns keyboard focus.
   * @param editable - Whether the mounted view currently accepts editing input.
   * @param options - Details about what the render pass already painted.
   */
  syncAfterRender(
    focused: boolean,
    editable: boolean,
    options?: MountedCaretSyncAfterRenderOptions
  ): void {
    const paintedCaretVisible = options?.paintedCaretVisible ?? true;

    this.focused = focused;
    this.editable = editable;
    this.visible = this.shouldShowCaret();

    if (this.shouldBlink()) {
      this.start();
    } else {
      this.stop();
    }

    if (paintedCaretVisible !== this.visible) {
      this.options.repaintOverlay();
    }
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
    this.applyAfterStateChange();
  }

  /** Stops the caret blink interval when the view is destroyed. */
  destroy(): void {
    this.stop();
  }

  /**
   * Reapplies caret visibility after a focus or mode change and always repaints.
   */
  private applyAfterStateChange(): void {
    this.visible = this.shouldShowCaret();
    this.options.repaintOverlay();

    if (this.shouldBlink()) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Reports whether the caret should currently paint, ignoring blink toggling.
   *
   * @returns Whether the caret bar should be visible.
   */
  private shouldShowCaret(): boolean {
    return resolveMountedCaretPresentation(this.mode, this.focused, this.editable).visible;
  }

  /**
   * Reports whether the caret should blink on a timer.
   *
   * @returns Whether the blink interval should run.
   */
  private shouldBlink(): boolean {
    return resolveMountedCaretPresentation(this.mode, this.focused, this.editable).blinking;
  }

  /** Starts the caret blink interval for a focused, editable mounted view. */
  private start(): void {
    this.timer.start(() => {
      this.visible = !this.visible;
      this.options.repaintOverlay();
    });
  }

  /** Stops the caret blink interval when focus leaves or the view is destroyed. */
  private stop(): void {
    this.timer.stop();
  }
}
