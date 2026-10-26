/** Inputs used to create the retained HTML clipboard output strategy. */
export interface CreateHtmlClipboardOutputStrategyOptions {
  /** DOM realm used by schema serialization, or null in DOM-free runtimes. */
  readonly ownerDocument: Document | null;
}
