import type { underlineStyles } from "./styles";
import type { MarkdownToken } from "@quirekit/core";
/** Exact persisted underline token. */
export type UnderlineStyle = typeof underlineStyles[number];
/** Independently editable underline properties. */
export interface UnderlineAttributes {
  /** Standard style; omission retains the selected runs' existing styles. */
  readonly underlineType?: UnderlineStyle;
  /** Opaque RGB or null to follow the glyph color. */
  readonly color?: string | null;
}
/** Options for the underline mark extension. */
export interface UnderlineOptions {
  /** HTML attributes added when the mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Underline Markdown token produced by the custom tokenizer. */
export interface UnderlineMarkdownToken extends MarkdownToken {
  /** Inline child tokens produced by the Markdown lexer. */
  readonly tokens?: readonly MarkdownToken[] | undefined;
}
