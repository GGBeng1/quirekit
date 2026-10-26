import type { QuireDocumentRange } from "../document";
import type { QuireRect } from "../geometry";

/** DOM overlay descriptor with resolved canvas geometry and optional document range. */
export interface QuireLayoutDomOverlay {
  /** Stable overlay identifier within the render output. */
  readonly id: string;
  /** Optional reuse key for DOM-node overlays with stable identity. */
  readonly key?: string | undefined;
  /** Optional document range represented by the overlay. */
  readonly range?: QuireDocumentRange;
  /** Resolved overlay rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** HTML content to mount in the overlay host. */
  readonly html?: string | undefined;
  /** Optional DOM node content for PM-compatible widget overlays. */
  readonly node?: unknown;
  /** Optional cleanup called when a mounted node overlay is replaced or removed. */
  readonly destroy?: ((node: unknown) => void) | undefined;
  /** Optional accessibility label for the overlay host. */
  readonly ariaLabel?: string;
  /** Optional semantic role applied by the mounted backend. */
  readonly role?: string;
  /** Whether the mounted overlay participates in browser pointer events. */
  readonly pointerEvents?: "auto" | "none";
}
