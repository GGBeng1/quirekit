/** Layout inputs for the native textarea height adapter. */
export interface TextareaAutoResizeOptions {
  /** Whether content owns the field height. */
  readonly enabled: boolean;
  /** Minimum visible text rows. */
  readonly rows: number;
  /** Optional maximum visible text rows. */
  readonly maxRows: number | undefined;
}
