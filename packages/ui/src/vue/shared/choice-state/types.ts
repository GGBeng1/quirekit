/** Array-model ownership shared by compound choice controls. */
export interface ChoiceStateProps {
  /** Host-owned selection; absence opts into local state. */
  readonly modelValue?: readonly string[] | undefined;
  /** Initial local values, captured once. */
  readonly defaultValue?: readonly string[] | undefined;
  /** Disable all interactive updates. */
  readonly disabled?: boolean | undefined;
  /** Keep focus and submission but reject interactive updates. */
  readonly readOnly?: boolean | undefined;
  /** Optional external native form association. */
  readonly form?: string | undefined;
}
