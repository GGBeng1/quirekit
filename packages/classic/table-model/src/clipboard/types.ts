import type { Schema, Slice } from "@quirekit/pm";
import type { WordTableSelection } from "../selection";

/** Semantic payloads derived from a structural Word table selection. */
export interface WordTableClipboardData {
  /** Internal ProseMirror slice containing a Word table subset. */
  readonly slice: Slice;
  /** Static-display slice whose table rows omit covered merge continuations. */
  readonly htmlSlice: Slice;
  /** Tab-separated plain text fallback for spreadsheet-like paste targets. */
  readonly tsv: string;
}

/** Options used to parse TSV into a Word table slice. */
export interface WordTableTsvParseOptions {
  /** Schema that owns the resulting Word table nodes. */
  readonly schema: Schema;
  /** Tab-separated value payload. */
  readonly tsv: string;
}

/** Options used to serialize a structural Word table selection. */
export interface WordTableSelectionClipboardOptions {
  /** Structural table selection to serialize. */
  readonly selection: WordTableSelection;
}
