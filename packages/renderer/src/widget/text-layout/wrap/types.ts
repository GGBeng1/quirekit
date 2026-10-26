import type { RunGrapheme } from "../units";
import type { QuireTextAnchor, QuireTextLineEnding, QuireTextLineSlot } from "../types";

/** Occupied source graphemes assigned to one available row slot. */
export interface LineSlotRun {
  /** Physical slot geometry in local text coordinates. */
  readonly slot: QuireTextLineSlot;
  /** Source-order graphemes placed into this slot. */
  readonly graphemes: readonly RunGrapheme[];
}

/** A visual line of run-tagged graphemes paired with its source anchors. */
export interface LineRun {
  /** Source termination reason; page boundaries never change this value. */
  readonly ending: QuireTextLineEnding;
  /** Graphemes on the line, excluding any consumed break. */
  readonly graphemes: readonly RunGrapheme[];
  /** Occupied slot runs in logical inline progression. */
  readonly slotRuns: readonly LineSlotRun[];
  /** Source anchor at the line's logical start. */
  readonly start: QuireTextAnchor;
  /** Source anchor just past the line's last content, excluding the break. */
  readonly end: QuireTextAnchor;
}

/** Mutable source-unit range protected by word or punctuation boundaries. */
export interface WrapGroupRange {
  /** Inclusive start index in the break-unit array. */
  startIndex: number;
  /** Exclusive end index in the break-unit array. */
  endIndex: number;
  /** Total measured width for the range. */
  width: number;
  /** Whether any unit in the range must remain unbroken. */
  nonBreakingGlue: boolean;
}

/** Mutable row packing authority shared by ordinary units and explicit tabs. */
export interface TextWrapState {
  /** Completed rows in source order. */
  readonly lines: readonly LineRun[];
  /** Current physical slot, available after seeking. */
  readonly slot: QuireTextLineSlot;
  /** Occupied advance in the active slot. */
  readonly width: number;
  /** Anchor for an empty row after a source hard break. */
  fallback: QuireTextAnchor;
  /** @param width - Required advance including candidate gaps. @param allowOverflow - Permit indivisible overflow. @param leadingSpacing - Gap omitted in an empty slot. @param graphemes - Measured candidate whose cell allocation can change at a new slot. */
  seek(width: number, allowOverflow: boolean, leadingSpacing?: number, graphemes?: readonly RunGrapheme[]): void;
  /** @param graphemes - Source graphemes. @param width - Their measured advance. */
  append(graphemes: readonly RunGrapheme[], width: number): void;
  /** @param ending - Source row termination. */
  flush(ending?: QuireTextLineEnding): void;
}
