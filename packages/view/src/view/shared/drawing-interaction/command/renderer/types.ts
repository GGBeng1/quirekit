import type { DrawingStroke } from "@quirekit/drawing-geometry";
import type { DrawingLayoutPreset } from "../../layout-menu";

/** Complete selected-object toolbar facts and command intents supplied by View. */
export interface QuireDrawingToolbarState {
  /** Current solid fill, or null for no fill. */
  readonly fill: string | null;
  /** Current solid outline, or null for no outline. */
  readonly stroke: string | null;
  /** Outline width in CSS layout pixels. */
  readonly strokeWidth: number;
  /** Canonical outline dash choice. */
  readonly strokeDash: DrawingStroke["dash"];
  /** Whether mutation is currently unavailable. */
  readonly disabled: boolean;
  /** Mounted product language. */
  readonly locale: "zh-CN" | "en";
  /** Current canonical text-wrapping preset. */
  readonly layout: DrawingLayoutPreset;
  /** Whether positioning follows text or remains fixed on its page. */
  readonly anchorMovement: "move-with-text" | "fixed-on-page";
  /** Whether the exact selected shape has an editable text Story. */
  readonly hasTextStory: boolean;
  /** Applies an existing canonical wrapping preset. */
  readonly onLayoutChange: (layout: DrawingLayoutPreset) => boolean;
  /** Applies an existing anchored movement mode. */
  readonly onAnchorMovementChange: (movement: "move-with-text" | "fixed-on-page") => boolean;
  /** Enters the exact selected shape's text Story. */
  readonly onEnterText: () => boolean;
  /** Deletes the exact selected object through its owner command. */
  readonly onDelete: () => boolean;
  /** Applies a fill choice to the exact current anchor. */
  readonly onFillChange: (color: string | null) => boolean;
  /** Applies an outline choice to the exact current anchor. */
  readonly onStrokeChange: (color: string | null) => boolean;
  /** Applies outline width without discarding other appearance fields. */
  readonly onStrokeWidthChange: (width: number) => boolean;
  /** Applies outline dash without discarding other appearance fields. */
  readonly onStrokeDashChange: (dash: DrawingStroke["dash"]) => boolean;
}

/** Product-owned controls retained while the same drawing remains selected. */
export interface QuireDrawingToolbarController {
  /** Complete toolbar surface; View supplies only an unstyled positioning host. */
  readonly element: HTMLElement;
  /** @param state - Latest exact-anchor facts and callbacks; retain open popup state. */
  update(state: QuireDrawingToolbarState): void;
  /** Releases the product UI application and all portalled surfaces. */
  destroy(): void;
}

/**
 * Mounts a complete product toolbar without introducing a UI framework into View.
 * @param ownerDocument - Document owning the selected-object card.
 * @param state - Initial exact-anchor appearance facts and commands.
 * @returns Stable controls with explicit update and disposal lifetimes.
 */
export type QuireDrawingToolbarRenderer = (
  ownerDocument: Document,
  state: QuireDrawingToolbarState
) => QuireDrawingToolbarController;

/** Editor-local registration and notification state. */
export interface DrawingToolbarRegistry {
  /** Ordered renderer registrations; the most recently mounted owner wins. */
  readonly renderers: QuireDrawingToolbarRenderer[];
  /** Mounted View controllers interested in renderer replacement. */
  readonly listeners: Set<() => void>;
}
