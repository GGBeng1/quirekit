/** Stable code reported when retained descriptor ownership cannot map a point. */
export const htmlDomMappingGapCode = "html-dom-mapping-gap" as const;

/** Explicit error for mountless, stale, or unrepresented DOM mappings. */
export class HtmlDomMappingGapError extends RangeError {
  /** Stable diagnostic code for mapping-gap handling. */
  readonly code = htmlDomMappingGapCode;

  /**
   * Creates an explicit retained ownership mapping gap.
   *
   * @param message - Human-readable mapping failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "HtmlDomMappingGapError";
  }
}
