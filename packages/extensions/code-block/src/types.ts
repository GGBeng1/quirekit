import type { MarkdownToken } from "@quirekit/core";

/** Default indentation size used when Tab indentation is enabled. */
export const DEFAULT_TAB_SIZE = 4;

/** Options for the codeBlock node extension. */
export interface CodeBlockOptions {
  /** Prefix added to language classes on rendered `code` elements. */
  readonly languageClassPrefix: string | null | undefined;
  /** Whether triple Enter exits the code block. */
  readonly exitOnTripleEnter: boolean | null | undefined;
  /** Whether ArrowDown exits the final code block. */
  readonly exitOnArrowDown: boolean | null | undefined;
  /** Default code language stored on new code blocks. */
  readonly defaultLanguage: string | null | undefined;
  /** Whether Tab and Shift-Tab indent code block text. */
  readonly enableTabIndentation: boolean | null | undefined;
  /** Number of spaces inserted or removed for indentation. */
  readonly tabSize: number | null | undefined;
  /** HTML attributes added when the code block serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Attributes accepted by code block commands. */
export interface CodeBlockAttributes {
  /** Language name stored on the code block. */
  readonly language?: string | null | undefined;
}

/** Markdown code token shape produced by marked. */
export interface CodeBlockMarkdownToken extends MarkdownToken {
  /** Raw source backing the token. */
  readonly raw?: string | undefined;
  /** Marked code block style hint. */
  readonly codeBlockStyle?: string | undefined;
  /** Fence language. */
  readonly lang?: string | undefined;
  /** Code text content. */
  readonly text?: string | undefined;
}

/** Parsed VS Code clipboard metadata. */
export interface VSCodeClipboardData {
  /** VS Code language id for copied code. */
  readonly mode?: string | undefined;
}
