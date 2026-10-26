/** Container-owned character geometry, expressed entirely in layout pixels. */
export interface QuireCharacterGrid {
  /** Additional per-grapheme spacing or integral cell allocation. */
  readonly mode: "spacing" | "cells";
  /** Positive cell pitch, independent of individual run font sizes. */
  readonly pitch: number;
  /** Signed spacing added in spacing mode, after glyph scaling and tracking. */
  readonly spacing: number;
  /** Maximum input rounding error per allocated unit; wrapping alone consumes it. */
  readonly roundingError?: number | undefined;
}

/** Resolved run policy; script and participation decisions belong to the caller. */
export interface QuireTextCharacterGrid extends QuireCharacterGrid {
  /** Allocate each grapheme or a contiguous text block to integral cells. */
  readonly unit: "grapheme" | "block";
  /** Placement of natural text inside the allocated cell span. */
  readonly align: "center" | "start";
}

/** Rolling block state; copying this small value supports speculative wrapping. */
export interface CharacterGridMeter {
  /** Occupied width including the current block's rounded allocation. */
  width: number;
  /** Accumulated allocation error bound for this physical slot. */
  tolerance: number;
  /** Natural width of the last mergeable block. */
  natural: number;
  /** Policy of that block, absent after a boundary. */
  grid: QuireTextCharacterGrid | undefined;
  /** Embedding level prevents joining distinct directional blocks. */
  level: number;
}

/** One slot's shared caret allocation and paint displacement. */
export interface CharacterGridGeometry {
  /** Allocated advances, including automatic boundary gaps. */
  readonly advances: number[];
  /** Physical left inset of each grapheme's ink. */
  readonly paintOffsets: number[];
  /** Stable local block identifiers; source style boundaries do not split a block. */
  readonly groups: number[];
}
