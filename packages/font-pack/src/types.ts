/** Discrete static font weights included for one family. */
export interface QuireStaticFontDiscreteWeights {
  /** Coverage discriminator. */
  readonly kind: "discrete";
  /** Exact weights included by the family CSS entry. */
  readonly values: readonly number[];
}

/** Continuous variable-font weight coverage included for one family. */
export interface QuireStaticFontWeightRange {
  /** Coverage discriminator. */
  readonly kind: "range";
  /** Smallest registered weight. */
  readonly min: number;
  /** Largest registered weight. */
  readonly max: number;
}

/** Weight coverage included for one explicitly mounted font family. */
export type QuireStaticFontWeightCoverage =
  | QuireStaticFontDiscreteWeights
  | QuireStaticFontWeightRange;

/** Exact style and weight coverage for families whose styles differ. */
export interface QuireStaticFontFaceManifest {
  /** CSS font style registered for this face. */
  readonly style: string;
  /** Exact weights registered for this style. */
  readonly weights: QuireStaticFontWeightCoverage;
}

/** Static metadata for one approved family inside the QuireKit font pack. */
export interface QuireStaticFontFamilyManifest {
  /** CSS family registered by the family entry. */
  readonly family: string;
  /** Optional product-facing label that does not change CSS identity. */
  readonly displayName?: string | undefined;
  /** Font styles included by the family CSS entry. */
  readonly styles: readonly string[];
  /** Union of weights present in the family; use faces for per-style coverage. */
  readonly weights: QuireStaticFontWeightCoverage;
  /** Authoritative per-style coverage when styles have different weight ranges. */
  readonly faces?: readonly QuireStaticFontFaceManifest[];
  /** Package CSS subpath that mounts only this family. */
  readonly cssPath: string;
  /** SPDX identifier governing the distributed font software. */
  readonly fontLicenseSpdxId: string;
  /** Package export containing the complete family font license text. */
  readonly fontLicensePath: string;
  /** Release maturity disclosed for assets that are not yet stable. */
  readonly stability?: "stable" | "preview" | undefined;
}

/** Static metadata exposed by the explicitly mounted QuireKit font pack. */
export interface QuireStaticFontPackManifest {
  /** Stable package identity used only by host/runtime configuration. */
  readonly id: string;
  /** Aggregate package CSS entry that mounts every included family. */
  readonly cssPath: string;
  /** Independently auditable family entries included by the package. */
  readonly families: readonly QuireStaticFontFamilyManifest[];
}
