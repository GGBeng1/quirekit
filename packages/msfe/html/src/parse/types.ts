/** Offsets relative to the bounded candidate, never to a normalized HTML string. */
export interface HtmlRange {
  /** Inclusive original source offset. */
  readonly from: number;
  /** Exclusive original source offset. */
  readonly to: number;
}

/** Validated, explicitly closed element with original delimiter offsets. */
export interface HtmlElement extends HtmlRange {
  /** Lowercase allowlisted HTML tag. */
  readonly tag: string;
  /** Original opening tag. */
  readonly open: HtmlRange;
  /** Original closing tag; null only for supported void elements. */
  readonly close: HtmlRange | null;
  /** Whether the element spans physical Markdown lines. */
  readonly multiline: boolean;
}

/** One complete root, without a second persistent document model. */
export interface HtmlFragment extends HtmlRange {
  /** Elements in original preorder. */
  readonly elements: readonly HtmlElement[];
  /** HTML text entities, excluding attributes. */
  readonly entities: readonly HtmlRange[];
}

/** Markdown-confirmed candidate. HTML never escapes into code-fence or inline-code contents. */
export interface HtmlCandidate extends HtmlRange {
  /** Exact bounded original text. */
  readonly source: string;
  /** Confirmed inline tag offsets; null for a complete Markdown HTMLBlock. */
  readonly tags: ReadonlySet<number> | null;
}
