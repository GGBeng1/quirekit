import type {
  QuireDocumentFontSet,
  QuireDocumentFontTable,
  QuireFontSlotResolver
} from "@quirekit/core";

/** Canonical document font slots consumed by renderer-neutral text layout. */
export type QuireDocumentFontSlot = "latin" | "eastAsia" | "complexScript";

/** Request for splitting canonical text into Word-compatible font-slot runs. */
export interface SplitQuireDocumentFontRunsRequest {
  /** Optional model-owned classification, evaluated before the neutral script fallback. */
  readonly resolveSlot?: QuireFontSlotResolver | undefined;
  /** Canonical text whose UTF-16 offsets must be preserved. */
  readonly text: string;
  /** Resolved CSS font shorthand inherited by the source text. */
  readonly font: string;
  /** Document typography role that supplies slot-specific families. */
  readonly fontSet: QuireDocumentFontSet;
  /** Optional document-provided alternate names for slot primary families. */
  readonly fontTable?: QuireDocumentFontTable | undefined;
  /** Optional Word run property that forces every source character into one slot. */
  readonly forceSlot?: QuireDocumentFontSlot | undefined;
}

/** One source-contiguous layout run assigned to a document font slot. */
export interface QuireDocumentFontRun {
  /** UTF-16 start offset inside the requested text. */
  readonly from: number;
  /** UTF-16 end offset inside the requested text. */
  readonly to: number;
  /** Exact source text covered by this run. */
  readonly text: string;
  /** Font slot selected from Unicode semantics or an explicit run override. */
  readonly slot: QuireDocumentFontSlot;
  /** Slot-specific CSS font shorthand used for measurement and paint. */
  readonly font: string;
}
