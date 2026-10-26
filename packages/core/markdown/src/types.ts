import type { marked } from "marked";

/** Content encodings understood by QuireKit serialization helpers. */
export type QuireMarkdownContentType = "json" | "html" | "markdown";

/** Tiptap-compatible JSON content used by Markdown conversion. */
export interface QuireMarkdownJSONContent {
  /** Node or mark type name. */
  readonly type?: string | undefined;
  /** Optional node or mark attributes. */
  readonly attrs?: Record<string, unknown> | undefined;
  /** Optional nested JSON content. */
  readonly content?: QuireMarkdownJSONContent[] | undefined;
  /** Optional marks applied to a text node. */
  readonly marks?: QuireMarkdownJSONMark[] | undefined;
  /** Text content for text nodes. */
  readonly text?: string | undefined;
  /** Extra JSON fields preserved for Tiptap compatibility. */
  readonly [key: string]: unknown;
}

/** Tiptap-compatible JSON mark used by Markdown conversion. */
export interface QuireMarkdownJSONMark {
  /** Mark type name. */
  readonly type: string;
  /** Optional mark attributes. */
  readonly attrs?: Record<string, unknown> | undefined;
  /** Extra JSON fields preserved for Tiptap compatibility. */
  readonly [key: string]: unknown;
}

/** Markdown token shape consumed by registered extension handlers. */
export interface QuireMarkdownToken extends QuireMarkedToken {
  /** Nested inline or block tokens. */
  readonly tokens?: readonly QuireMarkdownToken[] | undefined;
  /** Attributes captured by custom tokenizers. */
  readonly attributes?: Record<string, unknown> | undefined;
  /** Inline content captured by custom tokenizers. */
  readonly content?: string | undefined;
  /** Nested list items when provided by the tokenizer. */
  readonly items?: readonly QuireMarkdownToken[] | undefined;
  /** Heading or list depth when provided by the tokenizer. */
  readonly depth?: number | undefined;
}

/** Result returned by extension parse handlers. */
export type QuireMarkdownParseResult =
  | QuireMarkdownJSONContent
  | QuireMarkdownJSONContent[]
  | QuireMarkdownMarkParseResult;

/** Mark parse result returned by inline mark handlers. */
export interface QuireMarkdownMarkParseResult {
  /** Mark type name. */
  readonly mark: string;
  /** Content receiving the mark. */
  readonly content: QuireMarkdownJSONContent[];
  /** Optional mark attributes. */
  readonly attrs?: Record<string, unknown> | undefined;
}

/** Helpers passed to extension parse handlers. */
export interface QuireMarkdownParseHelpers {
  /**
   * Parses inline tokens into JSON content.
   *
   * @param tokens - Inline tokens.
   * @returns Parsed JSON content.
   */
  readonly parseInline: (tokens: readonly QuireMarkdownToken[]) => QuireMarkdownJSONContent[];
  /**
   * Parses block tokens into JSON content.
   *
   * @param tokens - Block tokens.
   * @returns Parsed JSON content.
   */
  readonly parseChildren: (tokens: readonly QuireMarkdownToken[]) => QuireMarkdownJSONContent[];
  /**
   * Creates a text node.
   *
   * @param text - Text content.
   * @param marks - Optional marks.
   * @returns Text JSON node.
   */
  readonly createTextNode: (
    text: string,
    marks?: QuireMarkdownJSONMark[] | undefined
  ) => QuireMarkdownJSONContent;
  /**
   * Creates a JSON node.
   *
   * @param type - Node type name.
   * @param attrs - Optional node attributes.
   * @param content - Optional node content.
   * @returns JSON node.
   */
  readonly createNode: (
    type: string,
    attrs?: Record<string, unknown> | undefined,
    content?: QuireMarkdownJSONContent[] | undefined
  ) => QuireMarkdownJSONContent;
  /**
   * Describes a mark result for inline content.
   *
   * @param markType - Mark type name.
   * @param content - Content receiving the mark.
   * @param attrs - Optional mark attributes.
   * @returns Mark parse result.
   */
  readonly applyMark: (
    markType: string,
    content: QuireMarkdownJSONContent[],
    attrs?: Record<string, unknown> | undefined
  ) => QuireMarkdownMarkParseResult;
}

/** Markdown render context passed to extension render handlers. */
export interface QuireMarkdownRenderContext {
  /** Child index inside the parent. */
  readonly index: number;
  /** Nesting level used for indentation. */
  readonly level: number;
  /** Parent node type when available. */
  readonly parentType?: string | null | undefined;
  /** Renderer metadata. */
  readonly meta?: Record<string, unknown> | undefined;
}

/**
 * Transforms the default Markdown rendering of one JSON node.
 *
 * @param node - JSON node being serialized.
 * @param output - Markdown produced by the normal renderer or fallback.
 * @param context - Rendering context for the node.
 * @returns Transformed Markdown.
 */
export type QuireMarkdownRenderTransform = (
  node: QuireMarkdownJSONContent,
  output: string,
  context: QuireMarkdownRenderContext
) => string;

/** Helpers passed to extension render handlers. */
export interface QuireMarkdownRendererHelpers {
  /**
   * Renders JSON children.
   *
   * @param nodes - Node or nodes to render.
   * @param separator - Optional separator.
   * @returns Rendered Markdown.
   */
  readonly renderChildren: (
    nodes: QuireMarkdownJSONContent | QuireMarkdownJSONContent[],
    separator?: string | undefined
  ) => string;
  /**
   * Wraps content with a block prefix.
   *
   * @param prefix - Prefix for every line.
   * @param content - Content to wrap.
   * @returns Wrapped Markdown.
   */
  readonly wrapInBlock: (prefix: string, content: string) => string;
  /**
   * Indents content by one indentation unit.
   *
   * @param content - Content to indent.
   * @returns Indented content.
   */
  readonly indent: (content: string) => string;
}

/** Lexer helpers passed to custom tokenizers. */
export interface QuireMarkdownLexerConfiguration {
  /**
   * Tokenizes inline Markdown source.
   *
   * @param source - Markdown source.
   * @returns Inline tokens.
   */
  readonly inlineTokens: (source: string) => QuireMarkdownToken[];
  /**
   * Tokenizes block Markdown source.
   *
   * @param source - Markdown source.
   * @returns Block tokens.
   */
  readonly blockTokens: (source: string) => QuireMarkdownToken[];
}

/** Custom tokenizer contributed by an extension. */
export interface QuireMarkdownTokenizer {
  /** Token name created by this tokenizer. */
  readonly name: string;
  /** Tokenizer level. */
  readonly level?: "block" | "inline" | undefined;
  /** Start matcher used by marked. */
  readonly start?: string | ((source: string) => number) | undefined;
  /**
   * Attempts to tokenize source.
   *
   * @param source - Source text.
   * @param tokens - Tokens parsed so far.
   * @param lexer - Lexer helpers.
   * @returns Parsed token, undefined, or void.
   */
  readonly tokenize: (
    source: string,
    tokens: QuireMarkdownToken[],
    lexer: QuireMarkdownLexerConfiguration
  ) => QuireMarkdownToken | undefined | void;
}

/** Extension-like object consumed by the Markdown manager. */
export interface QuireMarkdownExtension {
  /** Extension name. */
  readonly name: string;
  /** Marked token name used for parsing. */
  readonly markdownTokenName?: string | undefined;
  /** JSON node name targeted by a Markdown rendering transform. */
  readonly markdownNodeName?: string | undefined;
  /**
   * Parses a Markdown token.
   *
   * @param token - Token to parse.
   * @param helpers - Parse helpers.
   * @returns Parse result.
   */
  readonly parseMarkdown?: ((
    token: QuireMarkdownToken,
    helpers: QuireMarkdownParseHelpers
  ) => QuireMarkdownParseResult) | undefined;
  /**
   * Renders JSON content.
   *
   * @param node - JSON node to render.
   * @param helpers - Render helpers.
   * @param context - Render context.
   * @returns Rendered Markdown.
   */
  readonly renderMarkdown?: ((
    node: QuireMarkdownJSONContent,
    helpers: QuireMarkdownRendererHelpers,
    context: QuireMarkdownRenderContext
  ) => string) | undefined;
  /** Transform applied after the node's normal Markdown renderer or fallback. */
  readonly transformMarkdown?: QuireMarkdownRenderTransform | undefined;
  /** Custom tokenizer contributed by the extension. */
  readonly markdownTokenizer?: QuireMarkdownTokenizer | undefined;
  /** Markdown rendering options. */
  readonly markdownOptions?: QuireMarkdownExtensionOptions | undefined;
}

/** Markdown rendering options contributed by an extension. */
export interface QuireMarkdownExtensionOptions {
  /** Whether children should be indented when rendered by this extension. */
  readonly indentsContent?: boolean | undefined;
}

/** Normalized Markdown extension spec stored by the manager. */
export interface QuireMarkdownExtensionSpec {
  /** Token name used for parsing. */
  readonly tokenName: string;
  /** Node or mark name used for rendering. */
  readonly nodeName: string;
  /** Parse handler. */
  readonly parseMarkdown?: QuireMarkdownExtension["parseMarkdown"] | undefined;
  /** Render handler. */
  readonly renderMarkdown?: QuireMarkdownExtension["renderMarkdown"] | undefined;
  /** Default-output transform. */
  readonly transformMarkdown?: QuireMarkdownRenderTransform | undefined;
  /** Whether children should render one indentation level deeper. */
  readonly isIndenting: boolean;
  /** Custom tokenizer. */
  readonly tokenizer?: QuireMarkdownTokenizer | undefined;
}

/** Markdown indentation settings. */
export interface QuireMarkdownIndentationOptions {
  /** Indentation character family. */
  readonly style?: "space" | "tab" | undefined;
  /** Number of indentation characters per level. */
  readonly size?: number | undefined;
}

/** Options used to create a Markdown manager. */
export interface QuireMarkdownManagerOptions {
  /** Optional marked instance used for tokenization. */
  readonly marked?: typeof marked | undefined;
  /** Options forwarded to the marked instance. */
  readonly markedOptions?: Parameters<typeof marked.setOptions>[0] | undefined;
  /** Indentation settings for future block serializers. */
  readonly indentation?: QuireMarkdownIndentationOptions | undefined;
  /** Extension-like markdown specs registered with the manager. */
  readonly extensions?: readonly QuireMarkdownExtension[] | undefined;
}

/** Minimal marked token shape consumed by the first Markdown migration slice. */
export interface QuireMarkedToken {
  /** Marked token discriminator. */
  readonly type?: string | undefined;
  /** Raw source text represented by the token. */
  readonly raw?: string | undefined;
  /** Plain token text when marked provides one. */
  readonly text?: string | undefined;
  /** Inline or nested child tokens. */
  readonly tokens?: readonly QuireMarkedToken[] | undefined;
}
