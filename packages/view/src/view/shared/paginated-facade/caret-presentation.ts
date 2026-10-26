import {
  MountedCaretBlink,
  MountedDomCaret,
  resolveMountedDomCaretPlacement
} from "../caret";
import type { QuireViewRenderResult } from "../../types";
import type { QuireMountedCaretMode } from "../types";
import type {
  CreateMountedPaginatedTransientPresentationOptions,
  MountedPaginatedTransientRenderSyncOptions
} from "./types";

/** Caret presentation lifecycle shared by paginated mounted facades. */
export class MountedPaginatedCaretPresentation {
  private readonly overlayCaret: MountedCaretBlink | undefined;
  private readonly domCaret: MountedDomCaret | undefined;

  /**
   * Creates the configured overlay or DOM caret presenter.
   *
   * @param options - Mounted state accessors plus backend caret adapters.
   */
  constructor(
    private readonly options: CreateMountedPaginatedTransientPresentationOptions
  ) {
    if (options.caretRendering === "overlay") {
      this.overlayCaret = new MountedCaretBlink({
        repaintOverlay: () => {
          options.repaintOverlay(this.overlayCaretVisible());
        },
        ...(options.caretMode === undefined ? {} : { mode: options.caretMode })
      });
      this.domCaret = undefined;
    } else {
      this.overlayCaret = undefined;
      this.domCaret = new MountedDomCaret({
        ownerDocument: options.ownerDocument,
        host: options.overlayHost,
        className: options.domCaretClassName,
        ...(options.caretMode === undefined ? {} : { mode: options.caretMode })
      });
    }
  }

  /**
   * Updates focus-dependent caret visibility.
   *
   * @param focused - Whether the mounted facade owns focus.
   * @param editable - Whether the mounted facade accepts editing.
   */
  setFocused(focused: boolean, editable: boolean): void {
    this.overlayCaret?.setFocused(focused, editable);
    this.domCaret?.setFocused(focused, editable);
  }

  /**
   * Changes the active caret behavior.
   *
   * @param mode - Caret mode to apply.
   */
  setMode(mode: QuireMountedCaretMode): void {
    this.overlayCaret?.setMode(mode);
    this.domCaret?.setMode(mode);
  }

  /** Active caret behavior. */
  get mode(): QuireMountedCaretMode {
    return (this.domCaret ?? this.overlayCaret)?.caretMode ?? "blink";
  }

  /**
   * Reads visibility used by the next overlay repaint.
   *
   * @returns Whether overlay caret commands should paint.
   */
  overlayCaretVisible(): boolean {
    return this.overlayCaret?.visible ?? true;
  }

  /**
   * Synchronizes the active caret after a committed render.
   *
   * @param focused - Whether the mounted facade owns focus.
   * @param editable - Whether the mounted facade accepts editing.
   * @param renderResult - Latest committed render result, when available.
   * @param options - Optional visibility already painted by backend overlays.
   */
  syncAfterRender(
    focused: boolean,
    editable: boolean,
    renderResult: QuireViewRenderResult | undefined,
    options: MountedPaginatedTransientRenderSyncOptions
  ): void {
    if (this.overlayCaret !== undefined) {
      this.overlayCaret.syncAfterRender(
        focused,
        editable,
        options.overlayPaintedCaretVisible === undefined
          ? undefined
          : { paintedCaretVisible: options.overlayPaintedCaretVisible }
      );
      return;
    }

    this.domCaret?.syncAfterRender(
      focused,
      editable,
      renderResult === undefined
        ? undefined
        : resolveMountedDomCaretPlacement({
            renderResult,
            ...(this.options.displayListStyles === undefined
              ? {}
              : { displayListStyles: this.options.displayListStyles })
          })
    );
  }

  /** Releases caret presentation resources. */
  destroy(): void {
    this.overlayCaret?.destroy();
    this.domCaret?.destroy();
  }
}
