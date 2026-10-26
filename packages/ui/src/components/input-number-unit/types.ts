import type { QuireKitControlSize } from "../control";
import type { QuireKitSelectItem } from "../select";

/** Numeric entry and a separately controlled unit; conversion belongs to the consumer. */
export interface QuireKitInputNumberUnitProps {
  /** Accessible name of the numeric entry and compound group. */
  readonly label: string;
  /** Accessible name of the unit selector. */
  readonly unitLabel: string;
  /** Finite displayed value; null keeps the input empty. */
  readonly modelValue: number | null;
  /** Stable selected unit identifier. */
  readonly unit: string;
  /** Consumer-owned unit choices. */
  readonly units: readonly QuireKitSelectItem[];
  /** Shared height and typography for both controls. */
  readonly size?: QuireKitControlSize;
  /** Inline width of the complete compound control. */
  readonly width?: string | number;
  /** Reserved unit width; does not shrink with the numeric input. */
  readonly unitWidth?: string;
  /** Disables both controls. */
  readonly disabled?: boolean;
  /** Marks the numeric entry invalid. */
  readonly invalid?: boolean;
  /** Lowest valid value. */
  readonly min?: number;
  /** Highest valid value. */
  readonly max?: number;
  /** Keyboard and step-button increment. */
  readonly step?: number;
  /** Maximum displayed fractional digits. */
  readonly precision?: number;
}
