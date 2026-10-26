import type {
  QuireKitComboboxFilter,
  QuireKitComboboxItem,
  QuireKitComboboxLength,
  QuireKitComboboxPlacement
} from "../../components/combobox";

/** State-bearing properties consumed by the Combobox model adapter. */
export interface ComboboxModelProps {
  /** Admits an explicit selectable row for a nonempty custom value. */
  readonly allowCustomValue?: boolean;
  /** Controlled selected value. */
  readonly modelValue: string | null | undefined;
  /** Controlled popup state, when supplied. */
  readonly open: boolean | undefined;
  /** Initial uncontrolled selected value. */
  readonly defaultValue: string | undefined;
  /** Controlled visible input text. */
  readonly inputValue: string | undefined;
  /** Initial uncontrolled visible input text. */
  readonly defaultInputValue: string | undefined;
  /** Searchable option collection. */
  readonly items: readonly QuireKitComboboxItem[];
  /** Built-in local filtering strategy. */
  readonly filter: QuireKitComboboxFilter;
  /** Optional native form field name. */
  readonly name: string | undefined;
  /** Optional associated form identifier. */
  readonly form: string | undefined;
  /** Input control width. */
  readonly width: QuireKitComboboxLength;
  /** Optional popup width override. */
  readonly contentWidth: QuireKitComboboxLength | undefined;
  /** Preferred popup placement. */
  readonly placement: QuireKitComboboxPlacement;
}

/** Public value, search-text and popup update event boundary. */
export type ComboboxEmit = {
  (event: "update:modelValue", value: string | undefined): void;
  (event: "valueChange", value: string | undefined): void;
  (event: "update:inputValue", value: string): void;
  (event: "inputValueChange", value: string): void;
  (event: "openChange", open: boolean): void;
  (event: "update:open", open: boolean): void;
};


/** Normalized properties used by native form coordination. */
export interface ComboboxFormProps {
  /** Require a committed selection rather than only a search draft. */
  readonly required: boolean;
  /** Omit disabled controls from native submission and validation. */
  readonly disabled: boolean;
  /** Retain the current value without requiring edits. */
  readonly readOnly: boolean;
}
