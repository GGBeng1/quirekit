/** Validation failure with a stable configuration path. */
export interface ExportTemplateIssue {
  /** Dot-separated property path. */ readonly path: string;
  /** Human-readable explanation, without leaking unrelated input. */ readonly message: string;
}
/** Runtime schema node; kept independent of UI and format-specific dependencies. */
export type Rule = { readonly kind: 'number'; readonly min: number; readonly max: number }
  | { readonly kind: 'string'; readonly max: number; readonly color?: boolean; readonly values?: readonly string[] }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'object'; readonly fields: Readonly<Record<string, Rule>>; readonly atomic?: boolean }
  | { readonly kind: 'nullable'; readonly inner: Rule };
