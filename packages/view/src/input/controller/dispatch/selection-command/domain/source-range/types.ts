import type { QuireSelectionCommandEffect } from "../../types";

/** Capability required before a source-range command may proceed. */
export type QuireSourceRangeCommandCapability = "copyable" | "commandable";

/** Document range represented by a commandable source target. */
export interface QuireSourceRangeCommandRange {
  /** Inclusive start document position. */
  readonly from: number;
  /** Exclusive end document position. */
  readonly to: number;
}

/** Effect that explains why a source-range command cannot proceed. */
export type QuireSourceRangeCommandGuardEffect = Extract<
  QuireSelectionCommandEffect,
  | "blocked-capability"
  | "missing-command-capability"
  | "missing-command-source"
>;

/** Validated source-range command guard result. */
export type QuireSourceRangeCommandGuard =
  | {
      /** Valid source range that the command may operate on. */
      readonly range: QuireSourceRangeCommandRange;
      /** No blocking effect because the command may proceed. */
      readonly effect?: undefined;
    }
  | {
      /** Blocking effect that explains the missing command precondition. */
      readonly effect: QuireSourceRangeCommandGuardEffect;
      /** No range is available when the guard fails. */
      readonly range?: undefined;
    };
