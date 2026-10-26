import type { MathExpression, MathSequence } from '../model/types';

/** A caret between complete children of one editable sequence. */
export interface MathCaret {
  /** Stable structural path within the current document. */
  readonly slot: string;
  /** Child boundary, from zero through the child count. */
  readonly index: number;
}
/** Selection endpoints always belong to the same slot. */
export interface MathVisualSelection {
  /** Active endpoint. */
  readonly focus: MathCaret;
  /** Optional same-slot selection origin. */
  readonly anchor?: MathCaret;
}
/** Renderer-neutral editable slot with exact source projection. */
export interface MathVisualSlot {
  /** Structural path. */
  readonly id: string;
  /** Structural role: `root`, `numerator`, `cell-0-1`, `math-2` and so on. */
  readonly role: string;
  /** Kind of the expression owning this argument, absent at the root. */
  readonly owner?: MathExpression['kind'];
  /** Complete sequence, including a synthetic sequence around a script base. */
  readonly sequence: MathSequence;
  /** Inclusive content start in UTF-16 source units. */
  readonly from: number;
  /** Exclusive content end, without a closing delimiter. */
  readonly to: number;
  /** Whether this argument needs braces when modified. */
  readonly wrap: boolean;
  /** Owning child in the enclosing slot, absent at the root. */
  readonly parent?: MathCaret;
}
/** One successful visual edit atomically replaces source and caret. */
export interface MathVisualEdit {
  /** Exact source after the admitted local change. */
  readonly latex: string;
  /** Selection after reparsing the entire result. */
  readonly selection: MathVisualSelection;
}
/** A child's entire source span, including grouping delimiters. */
export interface MathChildSpan {
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
}
/** Supported visual navigation actions. */
export type MathVisualDirection = 'left' | 'right' | 'up' | 'down' | 'next' | 'previous' | 'home' | 'end';
/** Expression roles used to construct nested slot paths. */
export interface MathSlotChild {
  /** Role segment of the nested slot path. */
  readonly role: string;
  /** Argument content; a non-sequence is wrapped in a synthetic sequence. */
  readonly expression: MathSequence | MathExpression;
}
/** Accessible slot names for one interface language. */
export interface MathSlotLabels {
  /** Whole formula. */
  readonly root: string;
  /** Explicit brace group. */
  readonly group: string;
  /** Fraction numerator. */
  readonly numerator: string;
  /** Fraction denominator. */
  readonly denominator: string;
  /** Root index. */
  readonly degree: string;
  /** Root content. */
  readonly radicand: string;
  /** Scripted base. */
  readonly base: string;
  /** Subscript. */
  readonly subscript: string;
  /** Superscript. */
  readonly superscript: string;
  /** Subscript of a named function, such as a logarithm base. */
  readonly functionSubscript: string;
  /** Superscript of a named function, such as a power. */
  readonly functionSuperscript: string;
  /** Grouped function argument. */
  readonly argument: string;
  /** Lower operator limit. */
  readonly lower: string;
  /** Upper operator limit. */
  readonly upper: string;
  /** Grouped operator operand. */
  readonly body: string;
  /** Content between stretchy delimiters. */
  readonly fenceContent: string;
  /** Accented content. */
  readonly accentContent: string;
  /** Brace or arrow annotation. */
  readonly annotation: string;
  /** Font or box command content. */
  readonly styledContent: string;
  /** Formula nested in text. */
  readonly textFormula: string;
  /**
   * Names one environment cell.
   * @param row - Zero-based row.
   * @param column - Zero-based column.
   * @returns Accessible cell name.
   */
  readonly cell: (row: number, column: number) => string;
}
