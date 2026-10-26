import type { QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { QuireKeyboardInputEvent } from "../../types";

/** Options used to dispatch canvas fallback editing keys. */
export interface DispatchCanvasFallbackKeyOptions {
  /** Editor whose state should be edited. */
  readonly editor: QuireEditor;
  /** Keyboard event-like object. */
  readonly event: QuireKeyboardInputEvent;
  /**
   * Dispatches a transaction through the input controller.
   * @param transaction - Transaction to apply.
   */
  readonly dispatchTransaction: (transaction: Transaction) => void;
  /**
   * Dispatches canvas-owned keyboard selection movement.
   * @param event - Keyboard event-like object.
   * @returns Whether selection movement was handled.
   */
  readonly dispatchKeyboardSelection: (event: QuireKeyboardInputEvent) => boolean;
}

/** UTF-16 document range containing one complete text grapheme. */
export interface GraphemeDeleteRange {
  /** Inclusive PM document start. */
  readonly from: number;
  /** Exclusive PM document end. */
  readonly to: number;
}

/** Logical direction for a collapsed single-character delete. */
export type DeleteDirection = "backward" | "forward";
