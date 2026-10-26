/** One document location. IDs must be unique across the document and are not URL-encoded. */
export interface QuireKitAnchorItem {
  /** ID of the target heading or section element, without the leading hash. */
  readonly id: string;
  /** Readable link text, also used as the accessible name. */
  readonly label: string;
  /** Descendants in document reading order. */
  readonly children?: readonly QuireKitAnchorItem[];
}
/** Scroll owner, resolved after mount; a missing explicit owner never falls back to window. */
export type QuireKitAnchorContainer = string | HTMLElement | (() => HTMLElement | null | undefined);
/** Hierarchical navigation within one document. Layout and sticky positioning belong to the host. */
export interface QuireKitAnchorProps {
  /** Headings in reading order. An empty list renders no navigation. */
  readonly items: readonly QuireKitAnchorItem[];
  /** Optional visible heading above the links. */
  readonly title?: string;
  /** Navigation landmark name. Falls back to title, then the language pack. */
  readonly ariaLabel?: string;
  /** Scrollable element, selector or getter; omitted means window. */
  readonly scrollContainer?: QuireKitAnchorContainer;
  /** Distance from the viewport's inner top edge to the heading, in px. Defaults to 16. */
  readonly offset?: number;
  /** Explicit navigation motion. Defaults to smooth; reduced motion always uses instant. */
  readonly behavior?: 'smooth' | 'instant';
  /** Fragment history policy. Defaults to push; false disables URL writes and restoration. */
  readonly history?: 'push' | 'replace' | false;
}
/** A measured heading relative to the scroll viewport's inner top edge. */
export interface AnchorPosition {
  /** Original target ID. */
  readonly id: string;
  /** Vertical viewport-relative coordinate. */
  readonly top: number;
}

/** Reactive inputs read by the DOM controller after Vue has resolved defaults. */
export interface AnchorOptions {
  /** Hierarchical destinations. */
  readonly items: readonly QuireKitAnchorItem[];
  /** Optional owner descriptor. */
  readonly scrollContainer: QuireKitAnchorContainer | undefined;
  /** Resolved pixel offset. */
  readonly offset: number;
  /** Resolved navigation motion. */
  readonly behavior: 'smooth' | 'instant';
  /** Resolved fragment policy. */
  readonly history: 'push' | 'replace' | false;
}
