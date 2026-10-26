/** Public state needed to validate a pasted batch before committing it. */
export interface TagsPasteContext {
  /** Current committed tag values. */
  readonly value: string[];
  /** Preserve the rejected text as the editable draft. */
  readonly setInputValue: (value: string) => void;
}

/** Quantity and normalization policy shared by typed and pasted tags. */
export interface TagsPastePolicy {
  /** Whether pasted text is converted into tags. */
  readonly addOnPaste: boolean;
  /** Maximum number of committed tags. */
  readonly max: number;
  /** Whether values may exceed the quantity limit. */
  readonly allowOverflow: boolean;
  /** Whether identical values occupy separate entries. */
  readonly allowDuplicates: boolean;
  /** Separator used to split a pasted batch. */
  readonly delimiter: string | RegExp;
  /** Normalizes the whole draft and each resulting tag. */
  readonly sanitizeValue?: ((value: string) => string) | undefined;
}
