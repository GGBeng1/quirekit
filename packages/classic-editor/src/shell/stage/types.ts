import type { QuireRect } from "@quirekit/renderer";
import type { ClassicEditorZoomMode } from "../../types";

/** Minimal public page geometry needed by product reading controls. */
export interface ClassicEditorStagePage {
  /** Unscaled sheet box in the canonical vertically ordered page stack. */
  readonly pageRect: QuireRect;
  /** Public laid-out body bounds, independent of document-format units. */
  readonly bodyRect?: QuireRect | undefined;
}

/** Receives a measured reading percentage for a still-active automatic mode. */
export type ClassicEditorFitZoomListener = (percent: number, mode: Exclude<ClassicEditorZoomMode, "manual">) => void;

/** Instance-owned document staging, independent from document transactions. */
export interface ClassicEditorStageController {
  /**
   * Receives canonical document geometry from the public View snapshot.
   * @param bounds - Canonical full document bounds.
   * @param pages - Complete public sheet table before viewport clipping.
   */
  setDocumentLayout(bounds: QuireRect, pages: readonly ClassicEditorStagePage[] | undefined): void;
  /**
   * Checks whether a client point belongs to visible document paper.
   * @param clientX - Horizontal pointer coordinate in viewport CSS pixels.
   * @param clientY - Vertical pointer coordinate in viewport CSS pixels.
   * @returns Whether the current sheet table admits this point.
   */
  containsPagePoint(clientX: number, clientY: number): boolean;
  /**
   * Resolves a physical sheet independently of page DOM virtualization.
   * @param clientY - Client ordinate of a caret, including offscreen positions.
   * @returns Containing sheet in client CSS pixels, or undefined without matching geometry.
   */
  readPageRect(clientY: number): QuireRect | undefined;
  /**
   * Requests a reading percentage or automatic fit strategy.
   * @param percent - Requested reading percentage.
   * @param mode - Persistent reading strategy.
   */
  setZoom(percent: number, mode: ClassicEditorZoomMode): void;
  /** @returns Current page body fit percentage when layout is available. */
  getContentFitZoom(): number | undefined;
  /** @param x - Pinch center relative to the viewport. @param y - Pinch center relative to the viewport. */
  setZoomAnchor(x: number, y: number): void;
  /** Coalesces workspace and sidebar measurements into the next frame. */
  schedule(): void;
  /** Releases observers and pending frame work. */
  destroy(): void;
}
