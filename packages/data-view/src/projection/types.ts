/** Bounded document projection; full editable source remains in the embed. */
export interface DataViewPreview {
  /** Active authored view name. */ readonly title: string;
  /** A small rectangular text projection. */ readonly rows: readonly (readonly string[])[];
  /** Truthful source/partial-result disclosure. */ readonly notice: string;
}
