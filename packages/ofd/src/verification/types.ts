/** Stable issue codes reported while inspecting a serialized OFD package. */
export type OFDPackageVerificationIssueCode =
  | "action-invalid"
  | "action-reference-missing"
  | "archive-invalid"
  | "archive-limit-exceeded"
  | "archive-path-unsafe"
  | "id-duplicate"
  | "id-invalid"
  | "location-invalid"
  | "location-missing"
  | "max-unit-id-invalid"
  | "max-unit-id-mismatch"
  | "max-unit-id-missing"
  | "required-entry-missing"
  | "resource-reference-missing"
  | "xml-invalid"
  | "xml-root-invalid";

/** One structural failure found in an OFD ZIP package. */
export interface OFDPackageVerificationIssue {
  /** Stable machine-readable issue code. */
  readonly code: OFDPackageVerificationIssueCode;
  /** Human-readable explanation of the failure. */
  readonly message: string;
  /** Optional package entry containing the failure. */
  readonly entryPath?: string;
  /** Optional location value or unresolved package path. */
  readonly location?: string;
  /** Optional numeric ID involved in the failure. */
  readonly id?: string;
}

/** Bounds applied while unpacking an untrusted OFD archive. */
export interface OFDPackageVerificationLimits {
  /** Maximum accepted input archive size in bytes. */
  readonly maxArchiveBytes?: number;
  /** Maximum accepted number of unpacked archive entries. */
  readonly maxEntries?: number;
  /** Maximum accepted size of one unpacked archive entry in bytes. */
  readonly maxEntryBytes?: number;
  /** Maximum accepted total declared unpacked size in bytes. */
  readonly maxTotalEntryBytes?: number;
}

/** Optional policy controlling OFD package verification. */
export interface OFDPackageVerificationOptions {
  /** Throws an error instead of returning an invalid result when true. */
  readonly strict?: boolean;
  /** Optional archive input and output limits. */
  readonly limits?: OFDPackageVerificationLimits;
}

/** Immutable result from structural OFD package verification. */
export interface OFDPackageVerificationResult {
  /** Whether every checked package invariant passed. */
  readonly valid: boolean;
  /** Package entry paths observed after successful ZIP unpacking. */
  readonly entryPaths: readonly string[];
  /** Complete structural failures in deterministic discovery order. */
  readonly issues: readonly OFDPackageVerificationIssue[];
}

/** Error thrown by strict OFD package verification. */
export class OFDPackageVerificationError extends Error {
  /** Immutable verification result that caused the exception. */
  readonly result: OFDPackageVerificationResult;

  /**
   * Creates a strict verification error.
   *
   * @param result - Invalid result produced by the package verifier.
   */
  constructor(result: OFDPackageVerificationResult) {
    super(result.issues.map((issue) => issue.message).join("\n"));
    this.name = "OFDPackageVerificationError";
    this.result = result;
  }
}
