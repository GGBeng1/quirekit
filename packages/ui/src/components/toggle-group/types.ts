import type { QuireKitControlSize } from "../control";
/** One pressed/unpressed action in a toggle group. */
export interface QuireKitToggleGroupItem {
  /** Stable unique action value. */
  readonly value: string;
  /** Accessible action name, retained for custom icon content. */
  readonly label: string;
  /** Prevent this action from changing state. */
  readonly disabled?: boolean;
}
/** Composable button group with a shared array model for single and multiple modes. */
export interface QuireKitToggleGroupProps {
  /** Ordered choices with stable unique values. */
  readonly items: readonly QuireKitToggleGroupItem[];
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
  /** Optional equal-width columns; horizontal arrow keys retain item order. */
  readonly columns?: number;
  /** Action appearance; outline retains border geometry and adds a soft fill when selected. */
  readonly variant?: "ghost" | "outline";
  /** Selected outline color; defaults to primary. Ghost actions remain neutral. */
  readonly color?: "neutral" | "primary";
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
  /** Allow several independent pressed values; false by default. */
  readonly multiple?: boolean;
  /** Allow clearing a single selection by pressing it again. */
  readonly deselectable?: boolean;
  /** Use group arrow-key navigation; false uses individual Tab stops, not outer-toolbar delegation. */
  readonly rovingFocus?: boolean;
  /** Loop at the first and last enabled actions. */
  readonly loopFocus?: boolean;
}
/** Spacing configuration; individual buttons retain their own full token contract. */
export interface QuireKitToggleGroupTokens {
  /** Separation between related toggle actions. */
  readonly gap: string;
}
