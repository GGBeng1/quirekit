/** Presentation options independent of the host editor. */
export interface MathOutputOptions {
  /** Inline is the default; block uses native display mathematics layout. */
  readonly display?: 'inline' | 'block';
  /** Shows empty sequences as neutral boxes for template previews; false by default. */
  readonly placeholders?: boolean;
}
