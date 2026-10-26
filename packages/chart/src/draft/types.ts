import type { ChartSpec } from "../model/types";

/** Mutable detached JSON used exclusively by a data editor. */
export type MutableChartValue<Value> = Value extends readonly (infer Item)[]
  ? MutableChartValue<Item>[] : Value extends object
    ? { -readonly [Key in keyof Value]: MutableChartValue<Value[Key]> } : Value;

/** Revision-bound editor draft; it cannot mutate its source authority. */
export interface ChartDraft {
  /** Detached editable value. */
  value: MutableChartValue<ChartSpec>;
  /** Validates a proposed application against the current content revision. */
  prepare(current: ChartSpec): ChartSpec;
  /** Replaces the draft with a detached current revision. */
  reset(current: ChartSpec): void;
}
