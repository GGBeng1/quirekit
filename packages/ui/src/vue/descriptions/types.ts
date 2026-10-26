/** Maximum responsive column count, also used for an item's numeric span. */
export type QuireKitDescriptionsColumns = 1 | 2 | 3 | 4;
/** One ordered name–value pair; content formatting belongs to the consumer. */
export interface QuireKitDescriptionItem {
  /** Stable unique identity, retained across updates and reordering. */
  readonly key: string;
  /** Human-readable name; the label slot may enrich its content. */
  readonly label: string;
  /** Literal value; null, undefined and empty strings use emptyValue. */
  readonly value?: string | number | null;
  /** Columns occupied, capped by the current responsive count; full starts a new row. */
  readonly span?: QuireKitDescriptionsColumns | 'full';
}
/** Static native description list, responsive to its own container. */
export interface QuireKitDescriptionsProps {
  /** Ordered, uniquely keyed name–value pairs. */
  readonly items: readonly QuireKitDescriptionItem[];
  /** Optional visible heading. */
  readonly title?: string;
  /** Native heading level for the optional title. Defaults to h3. */
  readonly titleAs?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Accessible list name when there is no visible title. */
  readonly label?: string;
  /** Maximum columns; the container admits 2/3/4 at 36/54/72rem. Defaults to 2. */
  readonly columns?: QuireKitDescriptionsColumns;
  /** Position labels before or above values. Defaults to horizontal. */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Whitespace grouping or subtle item separators. Defaults to plain. */
  readonly variant?: 'plain' | 'divided';
  /** Content spacing and typography, independent of nested control sizes. Defaults to regular. */
  readonly density?: 'regular' | 'compact';
  /** Horizontal label track width as CSS length; capped at 40% of each item. Defaults to 8em. */
  readonly labelWidth?: string;
  /** Text displayed for missing values. Defaults to an em dash. */
  readonly emptyValue?: string;
}
