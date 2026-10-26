/** Ordered Markdown list item with indentation metadata. */
export interface OrderedListItem {
  /** Leading space count before the ordered marker. */
  readonly indent: number;
  /** Parsed item number. */
  readonly number: number;
  /** Item content without the list marker. */
  readonly content: string;
  /** Raw Markdown consumed for this item. */
  readonly raw: string;
}
