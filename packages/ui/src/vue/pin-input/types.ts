import type { QuireKitControlSize } from '../../components/control';

/** Characters accepted by a short-code field. */
export type QuireKitPinInputType = 'numeric' | 'alphabetic' | 'alphanumeric';

/** Rejected input reported without changing the current code. */
export interface QuireKitPinInputValueInvalidDetails {
  /** Rejected text after optional paste normalization. */
  readonly value: string;
  /** Zero-based index of the input receiving the text. */
  readonly index: number;
}

/** Fixed-length short-code field, independent of authentication or delivery services. */
export interface QuireKitPinInputProps {
  /** Controlled code; its characters map to successive inputs. */
  readonly modelValue?: string;
  /** Initial code and native form-reset baseline. */
  readonly defaultValue?: string;
  /** Positive number of cells; invalid values fall back to four. */
  readonly length?: number;
  /** Accepted character family. */
  readonly type?: QuireKitPinInputType;
  /** Accessible field name used in each cell's positional label; defaults to the language pack's code name. */
  readonly label?: string;
  /** Native id of the first visible input, for Field and external labels. */
  readonly id?: string;
  /** Native form field name; submits one string. */
  readonly name?: string;
  /** Optional id of the owning native form. */
  readonly form?: string;
  /** Shared control height and typography; cells remain square. */
  readonly size?: QuireKitControlSize;
  /** Disable focus and changes. */
  readonly disabled?: boolean | undefined;
  /** Preserve focus and reading while preventing changes. */
  readonly readOnly?: boolean | undefined;
  /** Require a complete code during native form submission. */
  readonly required?: boolean | undefined;
  /** Show an externally determined validation error. */
  readonly invalid?: boolean | undefined;
  /** Request the browser's one-time-code autocomplete. */
  readonly otp?: boolean;
  /** Visually mask characters without changing the model. */
  readonly mask?: boolean;
  /** Placeholder shown in each unfocused empty cell. */
  readonly placeholder?: string;
  /** Normalize pasted text before Ark validates and distributes it. */
  readonly sanitizeValue?: (value: string) => string;
}
