/** One host-owned location in a root-to-current hierarchy. */
export interface QuireKitBreadcrumbItem {
  /** Stable, unique identity; labels and URLs may change independently. */
  key: string;
  /** Readable location name, including when its icon is customized. */
  label: string;
  /** Actual browser destination; omitted values render static text. */
  href?: string;
  /** Native browsing context, such as _blank. */
  target?: string;
  /** Native link relationship; new-window links default to noopener noreferrer. */
  rel?: string;
  /** Keeps this location readable while removing navigation and tab focus. */
  disabled?: boolean;
}
/** Public path display and explicit overflow policy. */
export interface QuireKitBreadcrumbProps {
  /** Ordered locations; the final item is the current page. */
  items: readonly QuireKitBreadcrumbItem[];
  /** Accessible navigation landmark name; defaults to the language pack. */
  ariaLabel?: string;
  /** Visible entries including overflow; values below three are clamped to three. */
  maxItems?: number;
}
/** Context shared by visible and collapsed item content slots. */
export interface QuireKitBreadcrumbSlotProps {
  /** Original location from the supplied hierarchy. */
  item: QuireKitBreadcrumbItem;
  /** Index in the original, uncollapsed path. */
  index: number;
  /** Whether this is the final location. */
  current: boolean;
}
/** Pure view projection; null is the single overflow entry. */
export interface BreadcrumbProjection {
  /** Indices retained in the main ordered list. */
  visible: (number | null)[];
  /** Indices moved into the overflow surface, in hierarchy order. */
  hidden: number[];
}
