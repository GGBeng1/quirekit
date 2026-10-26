/** Stable semantic groups shared by visual browsing and keyboard search. */
export type MathTemplateGroup = 'basic' | 'calculus' | 'operators' | 'functions' | 'accents' | 'delimiters' | 'matrix' | 'sequences' | 'common';
/** A reusable authoring template independent of product panels. */
export interface MathTemplate {
  /** Stable catalog identity. */
  readonly id: string;
  /** Display name. */
  readonly label: string;
  /** Keywords for host search. */
  readonly keywords: readonly string[];
  /** Source with one explicit insertion marker. */
  readonly pattern: string;
  /** Human English name for bilingual search and hover. */
  readonly english?: string;
  /** Optional browsing group; custom templates default to basic. */
  readonly group?: MathTemplateGroup;
  /** Compact supported formula used for the visual preview when different. */
  readonly preview?: string;
  /** Wraps the preceding complete atom when the selection is collapsed. */
  readonly capturePrevious?: boolean;
  /**
   * Script roles this template adds, with their initial source; a preceding scripted atom,
   * argument-less function or operand-less operator receives them in place instead of being wrapped.
   */
  readonly scripts?: { readonly subscript?: string; readonly superscript?: string };
  /** The inserted structure needs no further input; the caret returns after it. */
  readonly completes?: boolean;
}
/** Exact source and the active empty slot after inserting a template. */
export interface MathTemplateInsertion {
  /** Updated author source. */
  readonly latex: string;
  /** UTF-16 caret offset in the updated source. */
  readonly caret: number;
}
