import type {
  ResolvedPos,
  SelectionRange,
  Slice
} from "@quirekit/pm";
import type { WordTableGridRect, WordTableSemanticCellRef } from "../map";

/** User-visible selection mode represented by a Word table selection. */
export type WordTableSelectionMode = "cell" | "row" | "column" | "table";

/** Options used to create a structural Word table selection. */
export interface WordTableSelectionCreateOptions {
  /** Absolute ProseMirror position before the selected `wordTable` node. */
  readonly tablePos: number;
  /** Table-relative position before the anchor explicit cell. */
  readonly anchorCellPos: number;
  /** Table-relative position before the head explicit cell. */
  readonly headCellPos: number;
  /** Structural selection mode. */
  readonly mode?: WordTableSelectionMode;
}

/** JSON payload registered under the Word table selection JSON id. */
export interface WordTableSelectionJSON {
  /** Selection JSON discriminator. */
  readonly type: "wordTable";
  /** Absolute ProseMirror position before the selected `wordTable` node. */
  readonly tablePos: number;
  /** Table-relative position before the anchor explicit cell. */
  readonly anchorCellPos: number;
  /** Table-relative position before the head explicit cell. */
  readonly headCellPos: number;
  /** Structural selection mode. */
  readonly mode: WordTableSelectionMode;
}

/** Resolved data stored on a structural Word table selection instance. */
export interface WordTableSelectionSnapshot {
  /** Absolute ProseMirror position before the selected `wordTable` node. */
  readonly tablePos: number;
  /** Table-relative position before the anchor explicit cell. */
  readonly anchorCellPos: number;
  /** Table-relative position before the head explicit cell. */
  readonly headCellPos: number;
  /** Structural selection mode. */
  readonly mode: WordTableSelectionMode;
  /** Expanded grid rect covered by the selection. */
  readonly rect: WordTableGridRect;
  /** Semantic cells selected by the expanded grid rect. */
  readonly cells: readonly WordTableSemanticCellRef[];
}

/** Fully resolved data needed to instantiate a Word table selection. */
export interface ResolvedWordTableSelection extends WordTableSelectionSnapshot {
  /** Resolved anchor explicit cell position. */
  readonly $anchor: ResolvedPos;
  /** Resolved head explicit cell position. */
  readonly $head: ResolvedPos;
  /** ProseMirror ranges covering selected cell nodes. */
  readonly ranges: readonly SelectionRange[];
}

/** Document-independent state stored by the table selection bookmark. */
export interface WordTableSelectionBookmarkState {
  /** Absolute ProseMirror position before the selected `wordTable` node. */
  readonly tablePos: number;
  /** Table-relative position before the anchor explicit cell. */
  readonly anchorCellPos: number;
  /** Table-relative position before the head explicit cell. */
  readonly headCellPos: number;
  /** Structural selection mode. */
  readonly mode: WordTableSelectionMode;
  /** Whether mapping deleted or invalidated a required table coordinate. */
  readonly invalid: boolean;
}

/** Clipboard data supplied directly by a Word table selection. */
export interface WordTableSelectionClipboardData {
  /** Internal ProseMirror slice containing copied table cells. */
  readonly slice: Slice;
  /** Static-display slice used by the shared semantic HTML serializer. */
  readonly htmlSlice: Slice;
  /** TSV plain text fallback for spreadsheet-like paste targets. */
  readonly plainText: string;
}
