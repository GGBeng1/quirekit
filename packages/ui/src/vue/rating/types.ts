/** Optical score sizes, independent of the shared button-height scale. */
export type QuireKitRatingSize = 'sm' | 'md' | 'lg';

/** Public properties of the editor-independent rating input. */
export interface QuireKitRatingProps {
  /** Visible accessible label; optional inside QuireField or QuireFormField. */
  readonly label?: string | undefined;
  /** Visually hide the standalone label while retaining its association. */
  readonly hideLabel?: boolean | undefined;
  /** Uncontrolled initial score; zero means no rating. */
  readonly defaultValue?: number | undefined;
  /** Total number of stars; normalized to a positive integer. */
  readonly count?: number | undefined;
  /** Allow pointer and keyboard selection in half-point increments. */
  readonly allowHalf?: boolean | undefined;
  /** Optical star scale, 16 / 20 / 24px; defaults to md. */
  readonly size?: QuireKitRatingSize | undefined;
  /** Show a separate clear action for editable scores. */
  readonly clearable?: boolean | undefined;
  /** Show the committed score beside the stars. */
  readonly showValue?: boolean | undefined;
  /** Native form control identity, including Field label association. */
  readonly id?: string | undefined;
  /** Native submitted field name; unnamed ratings do not submit a value. */
  readonly name?: string | undefined;
  /** ID of an external associated native form. */
  readonly form?: string | undefined;
  /** Disable input and omit the score from native submission. */
  readonly disabled?: boolean | undefined;
  /** Preserve reading, focus and submission while blocking changes. */
  readonly readOnly?: boolean | undefined;
  /** Require a positive score during native form validation. */
  readonly required?: boolean | undefined;
  /** Reflect external validation failure. */
  readonly invalid?: boolean | undefined;
}

/** Committed score available to the value slot. */
export interface QuireKitRatingValueSlotProps {
  /** Current committed score; zero means no rating. */
  readonly value: number;
  /** Maximum score and number of stars. */
  readonly count: number;
}

/** Content positions supported by Rating. */
export interface QuireKitRatingSlots {
  /** Replace the visible score summary without changing accessible state. */
  readonly value?: (props: QuireKitRatingValueSlotProps) => unknown;
}
