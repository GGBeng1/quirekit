import type { QuireKitListDensity } from '../../components/control';
import type { QuireKitListboxItemSlotProps } from '../../components/listbox';

/** Named membership destination, independent of visual left/right direction. */
export type QuireKitTransferSide = 'source' | 'target';

/** One stable member available to the two lists. */
export interface QuireKitTransferItem {
  /** Unique non-empty identity submitted by native forms. */
  readonly value: string;
  /** Visible name and Listbox typeahead text. */
  readonly label: string;
  /** Supporting text, also included in local search. */
  readonly description?: string;
  /** Lock membership changes for this member, retaining any existing target value. */
  readonly disabled?: boolean;
}

/** Public properties for explicit two-list membership selection. */
export interface QuireKitTransferProps {
  /** All currently known members, including any members in the target model. */
  readonly items: readonly QuireKitTransferItem[];
  /** Controlled target membership, in display and submission order. */
  readonly modelValue?: readonly string[] | undefined;
  /** Uncontrolled initial target membership and native reset baseline. */
  readonly defaultValue?: readonly string[] | undefined;
  /** Overall visible accessible label, optional inside Field/FormField; defaults to the language pack. */
  readonly label?: string | undefined;
  /** Hide the standalone label visually while retaining its association. */
  readonly hideLabel?: boolean | undefined;
  /** Visible and accessible name of the available-member list; defaults to the language pack. */
  readonly sourceLabel?: string | undefined;
  /** Visible and accessible name of the selected-member list; defaults to the language pack. */
  readonly targetLabel?: string | undefined;
  /** Enable independent local searches on both sides. */
  readonly searchable?: boolean | undefined;
  /** Content density of Listbox rows, independent of container width. */
  readonly density?: QuireKitListDensity | undefined;
  /** Native validation/label target; focus is redirected to the source list. */
  readonly id?: string | undefined;
  /** Repeated native field name for every target key. */
  readonly name?: string | undefined;
  /** ID of an externally associated native form. */
  readonly form?: string | undefined;
  /** Disable all interactions and omit target keys from native submission. */
  readonly disabled?: boolean | undefined;
  /** Allow inspection and temporary selection while preventing membership changes. */
  readonly readOnly?: boolean | undefined;
  /** Require at least one target key during native form validation. */
  readonly required?: boolean | undefined;
  /** Reflect external validation feedback. */
  readonly invalid?: boolean | undefined;
}

/** Completed membership change; temporary row selection is not a change. */
export interface QuireKitTransferChangeDetails {
  /** Requested complete target model. */
  readonly value: string[];
  /** Destination receiving the moved members. */
  readonly direction: QuireKitTransferSide;
  /** Known, enabled keys moved in this action. */
  readonly keys: string[];
}

/** Public non-interactive row content context. */
export interface QuireKitTransferItemSlotProps extends QuireKitListboxItemSlotProps {
  /** Source or target side rendering this item. */
  readonly side: QuireKitTransferSide;
}

/** Content slots that preserve Listbox's option and keyboard semantics. */
export interface QuireKitTransferSlots {
  /** Replace row content; do not nest controls inside a Listbox option. */
  readonly item?: (props: QuireKitTransferItemSlotProps) => unknown;
}
