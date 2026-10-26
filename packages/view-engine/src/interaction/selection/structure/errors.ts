/** Error raised when an opaque selection adapter cannot enter View Engine. */
export class QuireSelectionAdapterCompilationError extends Error {
  /** Stable diagnostics explaining the invalid adapter or semantic units. */
  readonly diagnostics: readonly string[];

  /**
   * Creates a structured-selection adapter compilation failure.
   *
   * @param diagnostics - Stable validation and compilation diagnostics.
   */
  constructor(diagnostics: readonly string[]) {
    super(`Invalid selection-adapter compilation: ${diagnostics.join(", ")}`);
    this.name = "QuireSelectionAdapterCompilationError";
    this.diagnostics = diagnostics;
  }
}
