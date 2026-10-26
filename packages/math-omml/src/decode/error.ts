/** Raised when a formula cannot be expressed exactly in the supported LaTeX grammar. */
export class OmmlDecodeError extends Error {
  /**
   * @param reason - User-facing explanation of the unsupported construct.
   */
  constructor(reason: string) {
    super(reason);
    this.name = "OmmlDecodeError";
  }
}
