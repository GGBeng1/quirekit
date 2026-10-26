import type { QuireKitControlSize } from "../control";
/** One independent option in a set of checkbox values. */
export interface QuireKitCheckboxGroupItem {
  /** Stable unique value submitted with the group name. */
  readonly value: string;
  /** Readable option name. */
  readonly label: string;
  /** Optional supporting text. */
  readonly description?: string;
  /** Preserve the stored value but disallow changes and submission. */
  readonly disabled?: boolean;
}
/** Checkbox array model and group semantics. */
export interface QuireKitCheckboxGroupProps {
  /** Ordered choices with stable unique values. */
  readonly items: readonly QuireKitCheckboxGroupItem[];
  /** Accessible name for the entire group. */
  readonly label: string;
  /** Controlled values, owned by the host. */
  readonly modelValue?: readonly string[];
  /** Initial non-controlled selection. */
  readonly defaultValue?: readonly string[];
  /** Shared action/choice density. */
  readonly size?: QuireKitControlSize;
  /** Visual and keyboard arrangement. */
  readonly orientation?: "horizontal" | "vertical";
  /** Disable all options and native submission. */
  readonly disabled?: boolean;
  /** Preserve focus and values while rejecting interactive changes. */
  readonly readOnly?: boolean;
  /** Repeated native form field name. */
  readonly name?: string;
  /** External native form association. */
  readonly form?: string;
  /** Expose validation failure supplied by the owning field. */
  readonly invalid?: boolean;
  /** Keep the legend accessible without a second visible label. */
  readonly hideLabel?: boolean;
}
/** Public composition context for optional before/after controls. */
export interface QuireKitCheckboxGroupContext {
  /** Current host or local selection. */
  readonly value: readonly string[];
  /** State derived from enabled items only. */
  readonly allChecked: boolean | "indeterminate";
  /** Whether there are no enabled items or the whole group is disabled. */
  readonly allDisabled: boolean;
  /** Read-only state for controls composed by the host. */
  readonly readOnly: boolean;
  /** Shared size for composed controls. */
  readonly size: QuireKitControlSize;
  /** Toggle all enabled options while preserving other stored values. */
  readonly toggleAll: () => void;
}
/** Shared spacing around a checkbox group, independent of individual mark size. */
export interface QuireKitCheckboxGroupTokens {
  /** Separation between labels and choices. */
  readonly gap: string;
  /** Separation between horizontally arranged options. */
  readonly inlineGap: string;
  /** Group label color. */
  readonly labelColor: string;
}
