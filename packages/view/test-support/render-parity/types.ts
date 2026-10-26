/** Renderer-neutral area compared by an incremental shadow check. */
export type QuireRenderParityArea =
  | "layout"
  | "interaction"
  | "selection"
  | "ownership"
  | "paint"
  | "dom-overlays";

/** Explicit fact that prevents a trustworthy parity comparison. */
export interface QuireRenderParityGap {
  /** Stable machine-readable gap category. */
  readonly code:
    | "live-dom-overlay"
    | "non-portable-image-source"
    | "non-serializable-fact"
    | "backend-reference-capability";
  /** Parity area containing the unsupported fact. */
  readonly area: QuireRenderParityArea;
  /** Stable path to the unsupported fact. */
  readonly path: string;
  /** Developer-facing explanation of the rejected comparison. */
  readonly message: string;
}

/** Stable renderer-neutral facts extracted from one render result. */
export interface QuireRenderParityFingerprint {
  /** Fingerprint schema version. */
  readonly version: 1;
  /** Canonical JSON facts keyed by independently diagnosable area. */
  readonly facts: Readonly<Record<QuireRenderParityArea, string>>;
  /** Explicit gaps that prevent this fingerprint from proving parity. */
  readonly gaps: readonly QuireRenderParityGap[];
}

/** One area where an incremental candidate differs from its full reference. */
export interface QuireRenderParityMismatch {
  /** Renderer-neutral area containing the mismatch. */
  readonly area: QuireRenderParityArea;
  /** First canonical fact path that differs within the area. */
  readonly path: string;
  /** Candidate value at the first differing path. */
  readonly candidateValue: unknown;
  /** Full-reference value at the first differing path. */
  readonly referenceValue: unknown;
  /** Canonical candidate facts for diagnostics. */
  readonly candidate: string;
  /** Canonical full-reference facts for diagnostics. */
  readonly reference: string;
}

/** Result of comparing incremental and independent full render fingerprints. */
export interface QuireRenderParityComparison {
  /** Whether every area matched and neither side exposed a comparison gap. */
  readonly matches: boolean;
  /** Area-level mismatches in stable comparison order. */
  readonly mismatches: readonly QuireRenderParityMismatch[];
  /** Candidate-side gaps that block a parity claim. */
  readonly candidateGaps: readonly QuireRenderParityGap[];
  /** Full-reference gaps that block a parity claim. */
  readonly referenceGaps: readonly QuireRenderParityGap[];
}
