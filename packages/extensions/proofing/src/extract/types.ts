import type { ProofingSurface } from "../types";

/** Contiguous text of one segment that maps one-to-one onto document positions. */
export interface ProofingTextSlice {
  /** UTF-16 offset of the slice inside its segment text. */
  readonly offset: number;
  /** Document position of the slice's first code unit. */
  readonly pos: number;
  /** Code units in the slice. */
  readonly length: number;
}

/** One same-language run of a textblock, with its offset map. */
export interface ExtractedProofingSegment {
  /** Text sent to the provider; boundary spaces have no slice. */
  readonly text: string;
  /** BCP 47 tag, or null to use the default language. */
  readonly language: string | null;
  /** Offset map, sorted by offset. */
  readonly slices: readonly ProofingTextSlice[];
  /** Whether nothing precedes the segment in its textblock. */
  readonly startsBlock: boolean;
}

/** Proofing view of one textblock. */
export interface ExtractedProofingBlock {
  /** Position immediately before the textblock. */
  readonly from: number;
  /** Position immediately after the textblock. */
  readonly to: number;
  /** Owning area, or null when the block is not checked. */
  readonly surface: ProofingSurface | null;
  /** Segments containing at least one letter. */
  readonly segments: readonly ExtractedProofingSegment[];
  /** Exact content identity used for result caching and validation. */
  readonly key: string;
}
