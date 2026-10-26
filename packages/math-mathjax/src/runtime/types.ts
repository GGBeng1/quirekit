import type { MathDocument, MathFormulaLayout, MathRenderer } from '@quirekit/math';

/** Explicit, bounded renderer cache ownership. */
export interface MathJaxRendererOptions {
  /** Maximum retained layouts; defaults to 64. */
  readonly maxEntries?: number;
  /** Conservative retained byte budget; defaults to 4 MiB. */
  readonly maxBytes?: number;
  /** Maximum distinct queued conversions; defaults to 128. */
  readonly maxPending?: number;
}
/** Dependencies of one formula layout. */
export interface MathJaxRenderOptions {
  /** Whether to publish empty placeholders and complete editing geometry. */
  readonly editable?: boolean;
  /** Presentation style; editable formulas use block style. */
  readonly display?: 'inline' | 'block';
}
/** Actual work counters, independent of overlay state. */
export interface MathJaxRendererStats {
  /** Completed layout attempts, including rejected outputs. */
  readonly layouts: number;
  /** Requests reusing an immutable layout or an in-flight conversion. */
  readonly hits: number;
  /** Currently retained layout count. */
  readonly entries: number;
  /** Conservative retained byte estimate. */
  readonly bytes: number;
  /** Distinct conversions still owned by this instance. */
  readonly pending: number;
}
/** Instance-owned MathJax service, without browser or editor dependencies. */
export interface MathJaxRenderer extends MathRenderer {
  /**
   * Produces the graphic and geometry from one admitted document snapshot.
   * @param document - Exact supported formula source and structure.
   * @param options - Explicit projection dependencies.
   * @returns Matching immutable SVG and logical geometry.
   */
  render(document: MathDocument, options?: MathJaxRenderOptions): Promise<MathFormulaLayout>;
  /**
   * Lays out read-only MathML produced by a trusted converter.
   * @param markup - Complete `<math>` markup.
   * @param label - Accessible description of the formula.
   * @returns Immutable SVG and em metrics, without editing slots.
   */
  renderMarkup(markup: string, label: string): Promise<MathFormulaLayout>;
  /**
   * Reads deterministic cache and layout work counts.
   * @returns Current renderer work snapshot.
   */
  getStats(): MathJaxRendererStats;
  /** Releases retained layouts; current conversions remain owned by this instance. */
  clear(): void;
  /** Releases ownership and prevents pending results from being published. */
  dispose(): void;
}
