import type { QuireMountedCaretMode } from "../types";

/**
 * Resolved caret presentation derived from caret mode, focus, and editability.
 *
 * It separates "should the caret show at all" from "should it blink", so both the
 * overlay-painted fallback and the DOM caret can drive their own surface from one
 * shared decision.
 */
export interface MountedCaretPresentation {
  /** Whether the caret bar should be shown for the current state. */
  readonly visible: boolean;
  /** Whether a visible caret should blink rather than stay steady. */
  readonly blinking: boolean;
}

/** Options used to create the overlay-painted caret blink lifecycle. */
export interface MountedCaretBlinkOptions {
  /** Repaints the overlay using the current caret visibility state. */
  readonly repaintOverlay: () => void;
  /** Initial caret mode. Defaults to `blink`. */
  readonly mode?: QuireMountedCaretMode | undefined;
}

/** Options used to synchronize overlay caret blinking after a render pass. */
export interface MountedCaretSyncAfterRenderOptions {
  /**
   * Whether the render pass already painted caret commands as visible. Defaults
   * to `true`, matching full canvas render passes that paint the raw overlay list.
   */
  readonly paintedCaretVisible?: boolean | undefined;
}

/**
 * Placement and style for a DOM caret element in document coordinates.
 *
 * Coordinates are document-space (root/overlay-layer-local), not client CSS pixels:
 * the caret element lives inside the document-spanning overlay layer that scrolls
 * with the content, so the caret rectangle is used as-is.
 */
export interface MountedDomCaretPlacement {
  /** Left edge of the caret in document coordinates. */
  readonly left: number;
  /** Top edge of the caret in document coordinates. */
  readonly top: number;
  /** Caret width in document coordinates. */
  readonly width: number;
  /** Caret height in document coordinates. */
  readonly height: number;
  /** CSS color used to paint the caret bar. */
  readonly color: string;
}

/** Options used to create a DOM caret element controller. */
export interface MountedDomCaretOptions {
  /** Document used to create the caret element. */
  readonly ownerDocument: Document;
  /** Host element the caret element is appended to. */
  readonly host: HTMLElement;
  /** CSS class assigned to the caret element. */
  readonly className: string;
  /** Initial caret mode. Defaults to `blink`. */
  readonly mode?: QuireMountedCaretMode | undefined;
}
