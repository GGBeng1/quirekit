/** Physical owner inherited by anchored controls in one product surface. */
export interface QuireOverlayHost {
  /** Target is resolved lazily because the product mounts after its descendants. */
  readonly target: () => HTMLElement | undefined;
  /** Offset-parent positioning for scrolling document hosts. */
  readonly strategy?: "absolute" | "fixed" | undefined;
}
