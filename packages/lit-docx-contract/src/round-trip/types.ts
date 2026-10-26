/** JSON data carried by a feature; executable values are never admitted. */
export type DocxRoundTripValue = null | boolean | number | string | readonly DocxRoundTripValue[] | { readonly [key: string]: DocxRoundTripValue };

/** Feature-owned metadata, interpreted only by the installed node codec. */
export interface DocxRoundTripMetadata {
  /** Positive feature schema version; independent of the envelope protocol. */
  readonly version: number;
  /** Validated JSON data needed to reconstruct the source node. */
  readonly data: DocxRoundTripValue;
}

/** One source-faithful record linked to a standard content control. */
export interface RoundTripRecord {
  /** Unique document-scoped SDT id. */ readonly id: string;
  /** Exact feature-defined tag. */ readonly tag: string;
  /** Digest of the control's visible content; lexical in version 1, semantic in version 2. */ readonly fingerprint: string;
  /** Feature payload. */ readonly metadata: DocxRoundTripMetadata;
}

/** Legacy Custom XML content whose records use lexical XML fingerprints and whole-part dependencies. */
export interface LexicalRoundTripEnvelope {
  /** Shared protocol version. */ readonly version: 1;
  /** Supporting XML part name to normalized digest. */ readonly dependencies: Readonly<Record<string, string>>;
  /** Independent source-node records. */ readonly records: readonly RoundTripRecord[];
}

/** Custom XML content whose records use producer-independent semantic fingerprints. */
export interface SemanticRoundTripEnvelope {
  /** Shared protocol version. */ readonly version: 2;
  /** Independent source-node records. */ readonly records: readonly RoundTripRecord[];
}

/** Every envelope version this codec can read. */
export type RoundTripEnvelope = LexicalRoundTripEnvelope | SemanticRoundTripEnvelope;

/** Original XML control with a canonical resource-aware content signature. */
export interface RoundTripControl {
  /** Source SDT id. */ readonly id: string;
  /** Source semantic tag. */ readonly tag: string;
  /** Canonical content digest. */ readonly fingerprint: string;
}
