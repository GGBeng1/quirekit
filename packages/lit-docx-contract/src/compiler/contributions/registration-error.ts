/** Machine-readable contribution registration failure. */
export type DocxContributionRegistrationErrorCode =
  | "empty-id"
  | "empty-owner-id"
  | "empty-capabilities"
  | "empty-capability-direction"
  | "empty-model-field"
  | "duplicate-field-capability-claim"
  | "missing-loss-diagnostic"
  | "missing-preservation-evidence"
  | "empty-codec"
  | "empty-claim"
  | "duplicate-id"
  | "duplicate-node-import-claim"
  | "duplicate-node-export-claim"
  | "duplicate-mark-import-claim"
  | "duplicate-mark-export-claim"
  | "duplicate-mark-attribute-import-source-claim"
  | "duplicate-mark-attribute-export-target-claim"
  | "missing-required-contribution"
  | "cyclic-contribution-dependency";

/** Structural error produced by an invalid contribution set. */
export class DocxContributionRegistrationError extends Error {
  /** Stable machine-readable registration error code. */
  readonly code: DocxContributionRegistrationErrorCode;

  /**
   * Creates one contribution registration error.
   *
   * @param code - Stable machine-readable error code.
   * @param message - Human-readable ownership or dependency detail.
   */
  constructor(code: DocxContributionRegistrationErrorCode, message: string) {
    super(message);
    this.name = "DocxContributionRegistrationError";
    this.code = code;
  }
}

/**
 * Throws one typed registration error.
 *
 * @param code - Stable machine-readable error code.
 * @param message - Human-readable detail.
 */
export function failDocxContributionRegistration(
  code: DocxContributionRegistrationErrorCode,
  message: string
): never {
  throw new DocxContributionRegistrationError(code, message);
}
