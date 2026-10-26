/** One portable Unicode value and its searchable presentation. */
export interface QuireKitEmojiItem {
  /** Exact Unicode sequence emitted on selection, including variation selectors. */ readonly value: string;
  /** Accessible name in the consumer's language. */ readonly label: string;
  /** Category identity resolved against groups. */ readonly group: string;
  /** Optional translated terms and shortcode aliases for search. */ readonly keywords?: readonly string[];
}

/** An ordered category in the picker footer. */
export interface QuireKitEmojiGroup {
  /** Stable category identity. */ readonly value: string;
  /** Accessible localized name. */ readonly label: string;
  /** Public QuireIcon registry name. */ readonly icon: string;
}

/** One continuously browsable group with an identity independent of duplicate Unicode shortcuts. */
export interface QuireKitEmojiSection {
  /** Internal section identity, distinct from host category values. */ readonly key: string;
  /** Localized visible and accessible heading. */ readonly label: string;
  /** Public category navigation icon. */ readonly icon: string;
  /** Ordered choices; the same Unicode value may also appear in another section. */ readonly items: readonly QuireKitEmojiItem[];
}

/** Editor-independent emoji panel; embedding and persistence belong to the host. Interface text follows the active language. */
export interface QuireKitEmojiPickerProps {
  /** Accessible panel name naming this instance; defaults to the language pack's emoji label. */ readonly label?: string;
  /** Replacement catalog; no network requests or remote image rendering. */ readonly items?: readonly QuireKitEmojiItem[];
  /** Replacement category order, labels and icons. */ readonly groups?: readonly QuireKitEmojiGroup[];
  /** Controlled Unicode value; selecting it again still emits select. */ readonly modelValue?: string | null;
  /** Host-owned recent values, newest first. Unknown or duplicate values are ignored. */ readonly recent?: readonly string[];
  /** Common shortcuts in display order; omission uses the curated defaults, [] hides this section. */ readonly common?: readonly string[];
  /** Whether all selection and search controls are unavailable. */ readonly disabled?: boolean;
  /** Initial search-field focus, useful inside a newly opened surface. */ readonly autofocus?: boolean;
}
