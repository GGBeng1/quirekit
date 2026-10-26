/** Minimum identity and accessible name for one carousel content item. */
export interface QuireKitCarouselItem {
  /** Stable unique key; retained content keeps its local state across list updates. */
  readonly key: string | number;
  /** Accessible slide name describing its content. */
  readonly label: string;
}

/** A content carousel with manual, page-based navigation. */
export interface QuireKitCarouselProps<Item extends QuireKitCarouselItem = QuireKitCarouselItem> {
  /** Content items with stable keys and readable slide labels. */
  readonly items: readonly Item[];
  /** Accessible name of the carousel region. */
  readonly label: string;
  /** Initial zero-based page when a controlled page is not supplied. */
  readonly defaultPage?: number;
  /** Whether previous and next navigation wrap at the ends; defaults to true. */
  readonly loop?: boolean;
  /** Axis used to lay out and scroll the slides. */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Explicit reading direction; otherwise inherited from the surrounding page. */
  readonly dir?: 'ltr' | 'rtl';
  /** Number of equally sized visible items, normalized to a positive integer. */
  readonly slidesPerPage?: number;
  /** Number of items advanced by one page, normalized to a positive integer. */
  readonly slidesPerMove?: number;
  /** Vertical viewport height (defaults to `20rem`), or a fixed card stage height; otherwise content sizes naturally. */
  readonly height?: string;
  /** Whether to show the previous and next buttons. */
  readonly arrows?: boolean;
  /** Whether to show the interactive page indicators. */
  readonly dots?: boolean;
  /** Enables mouse dragging; reduced-motion users retain manual navigation and native scrolling. */
  readonly draggable?: boolean;
  /** Pauses carousel navigation; current content actions remain consumer-owned. */
  readonly disabled?: boolean;
  /** `slide` scrolls pages side by side; `card` centers one item with neighbors receding behind it. */
  readonly effect?: 'slide' | 'card';
  /** Advances automatically: `true` every 4 seconds, or a delay in milliseconds. Hover, focus and reduced motion pause it. */
  readonly autoplay?: boolean | number;
  /** Width of the centered card as a CSS length, for the `card` effect; defaults to `50%`. */
  readonly cardWidth?: string;
}

/** Content supplied to the default item slot. */
export interface QuireKitCarouselItemSlotProps<Item extends QuireKitCarouselItem = QuireKitCarouselItem> {
  /** Original item, including consumer-specific fields. */
  readonly item: Item;
  /** Zero-based position in the supplied items. */
  readonly index: number;
  /** Whether enough of the item is visible to make its content accessible. */
  readonly inView: boolean;
}

/** Page summary supplied outside the scrollable content. */
export interface QuireKitCarouselPageSlotProps {
  /** Current zero-based page. */
  readonly page: number;
  /** Number of reachable page snap points. */
  readonly pageCount: number;
}

/** Carousel slots preserve content and business action ownership. */
export interface QuireKitCarouselSlots<Item extends QuireKitCarouselItem = QuireKitCarouselItem> {
  /** Content of each item; the item label is the default fallback. */
  readonly default?: (props: QuireKitCarouselItemSlotProps<Item>) => unknown;
  /** Content shown when the item collection is empty. */
  readonly empty?: () => unknown;
  /** Optional replacement for the current page and total page count. */
  readonly page?: (props: QuireKitCarouselPageSlotProps) => unknown;
}

/** Private item accessibility projection, independent from page navigation. */
export interface CarouselItemProps {
  /** Zero-based index consumed by the upstream item anatomy. */
  readonly index: number;
  /** Resolved accessible name. */
  readonly label: string;
  /** Server-side visible state before browser intersection measurements. */
  readonly initiallyVisible: boolean;
}
