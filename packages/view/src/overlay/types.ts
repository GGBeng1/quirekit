import type { QuireLayoutDomOverlay } from "@quirekit/view-engine";

/** Options used to synchronize DOM overlays for a canvas render result. */
export interface QuireDomOverlaySyncOptions {
  /** DOM element that hosts overlay children above the canvas. */
  readonly host: HTMLElement;
  /** Overlay descriptors produced by the canvas layout snapshot. */
  readonly overlays: readonly QuireLayoutDomOverlay[];
}
