/** Meaning of a completed task or an unavailable destination. */
export type QuireKitResultStatus = 'info' | 'success' | 'warning' | 'error' | 'forbidden' | 'not-found';

/** Result presentation within a content area or a compact panel. */
export type QuireKitResultSize = 'sm' | 'md';

/** Static task result; business actions, requests and navigation belong to the consumer. */
export interface QuireKitResultProps {
  /** Visible outcome, also used to name the result group. */
  readonly title: string;
  /** Optional cause or next-step explanation. */
  readonly description?: string;
  /** Selects the decorative visual and source color for status icons. Defaults to info. */
  readonly status?: QuireKitResultStatus;
  /** Content spacing and icon presentation. Defaults to sm; md provides a larger result area. */
  readonly size?: QuireKitResultSize;
  /** Native heading element within the surrounding document. Defaults to h3. */
  readonly titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Short accessible group name, overriding the visible title association when provided. */
  readonly label?: string;
  /** Registered icon name, or false to hide the icon. The icon slot takes precedence within icon mode. */
  readonly icon?: string | false | undefined;
  /** Shows the built-in status illustration instead of the icon. Defaults to false. */
  readonly illustrated?: boolean;
}

/** Resolved presentation state shared with Result content slots. */
export interface QuireKitResultSlotProps {
  /** Current outcome status. */
  readonly status: QuireKitResultStatus;
  /** Current presentation size. */
  readonly size: QuireKitResultSize;
}

/** Result content positions; recovery actions remain ordinary consumer-owned controls. */
export interface QuireKitResultSlots {
  /** Decorative artwork, shown even without illustrated; takes precedence over built-in art and icons. */
  readonly illustration?: (props: QuireKitResultSlotProps) => unknown;
  /** Decorative icon or illustration; meaningful explanations belong in the title or description. */
  readonly icon?: (props: QuireKitResultSlotProps) => unknown;
  /** Visible title content, retaining the native heading and accessible association. */
  readonly title?: (props: QuireKitResultSlotProps) => unknown;
  /** Explanation content, retaining the accessible description association. */
  readonly description?: (props: QuireKitResultSlotProps) => unknown;
  /** Additional result details, such as failed items or a receipt. */
  readonly default?: (props: QuireKitResultSlotProps) => unknown;
  /** Buttons or navigation controls arranged after the result details. */
  readonly actions?: (props: QuireKitResultSlotProps) => unknown;
}
