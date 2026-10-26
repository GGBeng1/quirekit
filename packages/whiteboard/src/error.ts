/** Stable failure identity for localized hosts; original diagnostics remain available to programmatic callers. */
export class WhiteboardError extends Error {
  /** Feature-owned diagnostic code; presentation layers may supply translated text. */
  readonly code: string;
  /** @param code - Stable diagnostic identity. @param message - Original developer-facing diagnostic. */
  constructor(code: string, message: string) { super(message); this.name = "WhiteboardError"; this.code = code; }
}
