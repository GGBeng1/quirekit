/** Inputs for a persistent, non-modal utility card over a product viewport. */
export interface QuireKitFloatingPanelProps {
  /** Whether panel content is mounted; closed panels have no observers. */
  readonly open: boolean;
  /** Positioned product root that owns the panel portal. */
  readonly root: HTMLElement;
  /** Document viewport the card stays inside; defaults to the product root. */
  readonly viewport?: HTMLElement | null;
  /** Accessible dialog name and draggable header text. */
  readonly title: string;
  /** Accessible close action supplied by the product's locale. */
  readonly closeLabel: string;
}

/** Rectangle in product-root CSS coordinates. */
export interface QuireKitFloatingPanelRect {
  /** Horizontal origin. */
  readonly x: number;
  /** Vertical origin. */
  readonly y: number;
  /** Horizontal extent. */
  readonly width: number;
  /** Vertical extent. */
  readonly height: number;
}

/** Retained card position in product-root CSS coordinates. */
export type QuireKitFloatingPanelPosition = Pick<QuireKitFloatingPanelRect, "x" | "y">;

/** Bounded card frame, excluding its content-owned natural height. */
export interface QuireKitFloatingPanelLayout extends QuireKitFloatingPanelPosition {
  /** Available inline size, capped at the shared utility-card width. */
  readonly width: number;
  /** Maximum visible height; taller content scrolls within the card. */
  readonly maxHeight: number;
}
