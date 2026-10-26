import type { MathEditor } from '../editor/types';
import type { MathFormulaLayout } from '../output/layout/types';
import type { MathEditorOverlay, MathOverlayOptions, MathSurfaceRect, MathSurfaceSlot } from '../geometry/types';

/** Explicit consumer-owned browser elements; no selectors or styles are inferred. */
export interface MathBrowserOptions {
  /** Borrowed headless authority; destroying the binding does not destroy it. */
  readonly editor: MathEditor;
  /** Scrollable formula surface owning pointer coordinates and capture. */
  readonly surface: HTMLElement;
  /** Native input/textarea or explicit contenteditable capture; also anchors the candidate window. */
  readonly input: HTMLElement;
  /**
   * Resolves the consumer-installed graphic, independently of backend markup.
   * @returns Current graphic element, or no mounted graphic.
   */
  readonly graphic: () => Element | null | undefined;
  /** Numeric dimensions for a consumer-painted caret. */
  readonly overlay?: MathOverlayOptions;
  /**
   * Allows a consumer-owned toolbar or dialog to suspend pointer interaction.
   * @returns Whether an additional UI owner currently holds interaction.
   */
  readonly suspended?: () => boolean;
}
/** Immutable numeric facts for an overlay implemented in any browser framework. */
export interface MathBrowserSnapshot {
  /** Geometry proven against the current consumer-installed graphic. */
  readonly geometry: readonly MathSurfaceSlot[];
  /** Numeric cursor, active slot and selection decoration. */
  readonly overlay: MathEditorOverlay;
  /** Last known cursor position; retained while new graphics are pending. */
  readonly inputAnchor?: MathSurfaceRect | undefined;
  /** Whether a captured drag currently owns selection tracking. */
  readonly dragging: boolean;
  /** Number of graphic/surface measurements, for work-budget verification. */
  readonly measurements: number;
  /** Number of accepted frame/final drag updates. */
  readonly pointerUpdates: number;
}
/** Framework-independent browser lifecycle; consumers paint every control and overlay. */
export interface MathBrowserBinding {
  /**
   * Reads retained numeric state without measuring the DOM.
   * @returns Current stable immutable browser snapshot.
   */
  getSnapshot(): MathBrowserSnapshot;
  /**
   * Listens for geometry or decoration changes.
   * @param listener - Called after changed numeric facts are retained.
   * @returns Idempotent unsubscribe.
   */
  subscribe(listener: (snapshot: MathBrowserSnapshot) => void): () => void;
  /**
   * Confirms graphic identity after the consumer has installed this exact layout.
   * @param layout - Current headless output installed in the DOM, or no graphic.
   * @returns Whether matching geometry was measured and admitted.
   */
  setRenderedLayout(layout: MathFormulaLayout | undefined): boolean;
  /** Remeasures the confirmed graphic after an explicit consumer coordinate change. */
  refresh(): void;
  /** Restores native input focus without moving the page or formula selection. */
  focus(): void;
  /** Removes events, observers and frames; releases capture without disposing the editor. */
  destroy(): void;
}

/** Internal lifecycle of one pointer-captured drag. */
export interface MathPointerBinding {
  /** Reads whether a drag currently owns the surface. */
  isDragging(): boolean;
  /** Reads accepted tracking-frame/final updates. */
  getUpdates(): number;
  /** Releases capture and a pending frame without accepting a new point. */
  end(): void;
  /** Removes listeners and releases transient ownership. */
  destroy(): void;
}
/** Internal dependency ports; geometric algorithms remain in the pure core. */
export interface MathPointerOptions {
  /** Borrowed source and selection authority. */
  readonly editor: MathEditor;
  /** Explicit pointer capture surface. */
  readonly surface: HTMLElement;
  /**
   * Reads retained matching slots without measuring glyphs.
   * @returns Projected slots.
   */
  readonly geometry: () => readonly MathSurfaceSlot[];
  /**
   * Reads current interaction ownership.
   * @returns Whether input or another UI owner blocks pointer selection.
   */
  readonly suspended: () => boolean;
  /** Restores native capture focus. */
  readonly focus: () => void;
  /** Publishes changed drag ownership or work counts. */
  readonly changed: () => void;
}

/** Internal native-buffer operations shared by form and non-form input hosts. */
export interface MathInputBuffer {
  /** @returns Pending native text for the IME fallback. */
  read(): string;
  /** Clears consumed text only when the IME releases native ownership. */
  clear(): void;
  /** @param disabled - Whether the canonical editor rejects native editing. */
  setDisabled(disabled: boolean): void;
  /** Restores the consumer's original content and availability attributes. */
  restore(): void;
}
