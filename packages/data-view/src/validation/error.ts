/** Path-bearing error that never replaces rejected input with empty data. */
export class DataViewError extends Error {
  /** Stable diagnostic classification. */
  readonly code: "invalid" | "unsupported" | "budget" | "conflict";
  /** JSON-style location of the problem. */
  readonly path: string;
  /** Creates a portable validation or conflict diagnostic.
   * @param code - Stable classification.
   * @param path - Offending location.
   * @param message - Human-readable explanation.
   */
  constructor(code: DataViewError["code"], path: string, message: string) {
    super(`${path}: ${message}`); this.name = "DataViewError"; this.code = code; this.path = path;
  }
}

/** Refuses invalid input at its owning path.
 * @param condition - Required invariant.
 * @param path - Diagnostic location.
 * @param message - Explanation.
 */
export function requireData(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new DataViewError("invalid", path, message);
}
