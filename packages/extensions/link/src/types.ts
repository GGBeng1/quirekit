import type { MarkdownToken, QuireRange } from "@quirekit/core";

/** Options for the renderer-neutral hyperlink mark. */
export interface LinkOptions {
  /** Additional serialized anchor attributes. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Derived glyph color, not persistent document state. */
  readonly color: string;
  /** Complete typed URLs after whitespace/Enter; defaults to true. */
  readonly autolink: boolean;
}

/** Persistent hyperlink target. */
export interface LinkAttributes {
  /** Safe external, internal-anchor, or relative target. */
  readonly href: string;
}

/** Input for insertion or updating an existing hyperlink. */
export interface LinkInsertionAttributes extends LinkAttributes {
  /** Visible label; omitted on update preserves all runs, blank falls back to href. */
  readonly text?: string;
}

/** One contiguous link occurrence containing the complete current selection. */
export interface LinkRange extends QuireRange, LinkAttributes {}

/** Markdown lexer token for a link. */
export interface LinkMarkdownToken extends MarkdownToken {
  /** Parsed destination. */
  readonly href?: string | undefined;
  /** Label tokens. */
  readonly tokens?: readonly MarkdownToken[] | undefined;
}

/** Public typed commands installed by Link. */
export type LinkCommandMethods<ReturnType> = {
  /** Marks the selected text without replacing it. */
  setLink: (attributes: LinkAttributes) => ReturnType;
  /** Inserts linked text at a plain collapsed caret. */
  insertLink: (attributes: LinkInsertionAttributes) => ReturnType;
  /** Updates the complete current link, optionally replacing its label. */
  updateLink: (attributes: LinkInsertionAttributes) => ReturnType;
  /** Toggles the link mark on the current selection. */
  toggleLink: (attributes: LinkAttributes) => ReturnType;
  /** Removes only the link mark, retaining text. */
  unsetLink: () => ReturnType;
};
