import type { MarkdownToken } from "@quirekit/core";

/** Heading levels supported by the heading extension. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

/** Options for the heading node extension. */
export interface HeadingOptions {
  /** Heading levels accepted by parsing, rendering, commands, and shortcuts. */
  readonly levels: Level[];
  /** HTML attributes added when headings serialize to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Attributes accepted by heading commands. */
export interface HeadingAttributes {
  /** Heading level to apply. */
  readonly level: Level;
}

/** Markdown heading token shape produced by marked. */
export interface HeadingMarkdownToken extends MarkdownToken {
  /** Heading depth from one to six. */
  readonly depth?: number | undefined;
  /** Inline child tokens that make up the heading text. */
  readonly tokens?: readonly MarkdownToken[] | undefined;
}

/** Public heading command methods. */
type HeadingCommandMethods<ReturnType> = {
  /** @param attributes - Requested heading level. @returns Command result. */
  setHeading: (attributes: HeadingAttributes) => ReturnType;
  /** @param attributes - Heading level to toggle. @returns Command result. */
  toggleHeading: (attributes: HeadingAttributes) => ReturnType;
};

declare module "@quirekit/core" {
  /** Public commands contributed by the Heading extension. */
  interface Commands<ReturnType> {
    /** Commands installed by the Heading extension. */
    readonly heading: HeadingCommandMethods<ReturnType>;
  }
}
