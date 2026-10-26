import type {
  WordParagraphFormattingPatch,
  WordParagraphIndentation,
  WordParagraphLineSpacing,
  WordParagraphSpacing
} from "../types";

/** General first-class Word paragraph property update. */
export interface SetWordParagraphPropertiesOptions {
  /** Validated property patch applied to every covered paragraph. */
  readonly properties: WordParagraphFormattingPatch;
}

/** Exact intent applied to every paragraph covered by the current selection. */
export interface SetWordParagraphIndentationOptions {
  /** Complete normalized indentation target. */
  readonly indentation: WordParagraphIndentation;
}

/** Direction accepted by the selection-aware paragraph-indent step command. */
export type AdjustWordParagraphIndentationDirection = "increase" | "decrease";

/** Exact paragraph spacing applied to every selected paragraph. */
export interface SetWordParagraphSpacingOptions {
  /** Complete normalized paragraph spacing target. */
  readonly spacing: WordParagraphSpacing;
}

/** Line-spacing update that preserves paragraph before/after distances. */
export interface SetWordParagraphLineSpacingOptions {
  /** Typed line spacing, or null to return to inherited spacing. */
  readonly line: WordParagraphLineSpacing | null;
}

/** Explicit measurement applied to one side of every selected paragraph. */
export interface SetWordParagraphSpacingSideOptions {
  /** Side whose physical, line-relative and automatic fields are replaced together. */
  readonly side: "before" | "after";
  /** dxa means twips; line means hundredths of one final paragraph line. */
  readonly unit: "dxa" | "line";
  /** Non-negative integral canonical magnitude. */
  readonly value: number;
}
