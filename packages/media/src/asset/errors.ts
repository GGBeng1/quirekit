/** Stable validation failures exposed by the portable media contract. */
export type QuireMediaAssetValidationErrorCode =
  | "empty-data"
  | "invalid-file-name"
  | "invalid-id"
  | "invalid-intrinsic-size"
  | "invalid-kind"
  | "invalid-mime-type"
  | "invalid-reference"
  | "reference-mismatch";

/** Error raised when portable media input violates the shared contract. */
export class QuireMediaAssetValidationError extends TypeError {
  /** Machine-readable validation failure. */
  readonly code: QuireMediaAssetValidationErrorCode;

  /**
   * Creates one media validation error.
   *
   * @param code - Machine-readable validation failure.
   * @param message - Human-readable diagnostic.
   */
  constructor(code: QuireMediaAssetValidationErrorCode, message: string) {
    super(message);
    this.name = "QuireMediaAssetValidationError";
    this.code = code;
  }
}

/** Error raised when one id is registered with different complete asset data. */
export class QuireMediaAssetConflictError extends Error {
  /** Stable identifier whose existing asset did not match. */
  readonly assetId: string;

  /**
   * Creates one deterministic asset-id conflict.
   *
   * @param assetId - Stable identifier whose complete assets differed.
   */
  constructor(assetId: string) {
    super(`Media asset "${assetId}" is already registered with different data.`);
    this.name = "QuireMediaAssetConflictError";
    this.assetId = assetId;
  }
}
