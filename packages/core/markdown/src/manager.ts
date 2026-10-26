import { marked, type Tokens } from "marked";
import type {
  QuireMarkedToken,
  QuireMarkdownExtension,
  QuireMarkdownExtensionSpec,
  QuireMarkdownJSONContent,
  QuireMarkdownJSONMark,
  QuireMarkdownManagerOptions,
  QuireMarkdownMarkParseResult,
  QuireMarkdownParseHelpers,
  QuireMarkdownParseResult,
  QuireMarkdownRenderContext,
  QuireMarkdownRendererHelpers,
  QuireMarkdownToken,
  QuireMarkdownTokenizer
} from "./types";

/** Parses and serializes Tiptap-compatible Markdown content. */
export class MarkdownManager {
  private readonly markedInstance: typeof marked;

  private lexer: InstanceType<typeof marked.Lexer>;

  private readonly parseRegistry = new Map<string, QuireMarkdownExtensionSpec[]>();

  private readonly renderRegistry = new Map<string, QuireMarkdownExtensionSpec[]>();

  private readonly transformRegistry = new Map<string, QuireMarkdownExtensionSpec[]>();

  private readonly indentStyle: "space" | "tab";

  private readonly indentSize: number;

  /**
   * Creates a Markdown manager.
   *
   * @param options - Tokenizer and formatting options.
   */
  constructor(options: QuireMarkdownManagerOptions = {}) {
    this.markedInstance = options.marked ?? marked;
    this.lexer = new this.markedInstance.Lexer();
    this.indentStyle = options.indentation?.style ?? "space";
    this.indentSize = options.indentation?.size ?? 2;

    if (options.markedOptions) {
      this.markedInstance.setOptions(options.markedOptions);
    }

    for (const extension of options.extensions ?? []) {
      this.registerExtension(extension, false);
    }

    this.lexer = new this.markedInstance.Lexer();
  }

  /**
   * Returns the marked instance used by this manager.
   *
   * @returns Marked tokenizer instance.
   */
  get instance(): typeof marked {
    return this.markedInstance;
  }

  /**
   * Returns the indentation character for block serializers.
   *
   * @returns Space or tab indentation character.
   */
  get indentCharacter(): string {
    return this.indentStyle === "space" ? " " : "\t";
  }

  /**
   * Returns one indentation unit.
   *
   * @returns Repeated indentation characters.
   */
  get indentString(): string {
    return this.indentCharacter.repeat(this.indentSize);
  }

  /**
   * Registers extension-owned Markdown handlers.
   *
   * @param extension - Extension-like object that contributes Markdown fields.
   * @param recreateLexer - Whether to recreate the lexer after tokenizer registration.
   */
  registerExtension(
    extension: QuireMarkdownExtension,
    recreateLexer = true
  ): void {
    const tokenName = extension.markdownTokenName ?? extension.name;
    const nodeName = extension.markdownNodeName ?? extension.name;
    const spec: QuireMarkdownExtensionSpec = {
      tokenName,
      nodeName,
      parseMarkdown: extension.parseMarkdown,
      renderMarkdown: extension.renderMarkdown,
      transformMarkdown: extension.transformMarkdown,
      isIndenting: extension.markdownOptions?.indentsContent ?? false,
      tokenizer: extension.markdownTokenizer
    };

    if (spec.parseMarkdown) {
      const parseHandlers = this.parseRegistry.get(tokenName) ?? [];
      parseHandlers.push(spec);
      this.parseRegistry.set(tokenName, parseHandlers);
    }

    if (spec.renderMarkdown) {
      const renderHandlers = this.renderRegistry.get(nodeName) ?? [];
      renderHandlers.push(spec);
      this.renderRegistry.set(nodeName, renderHandlers);
    }

    if (spec.transformMarkdown) {
      const transforms = this.transformRegistry.get(nodeName) ?? [];
      transforms.push(spec);
      this.transformRegistry.set(nodeName, transforms);
    }

    if (spec.tokenizer) {
      this.registerTokenizer(spec.tokenizer);

      if (recreateLexer) {
        this.lexer = new this.markedInstance.Lexer();
      }
    }
  }

  /**
   * Parses Markdown into Tiptap-compatible JSON.
   *
   * @param markdown - Markdown source string.
   * @returns JSON document content.
   */
  parse(markdown: string): QuireMarkdownJSONContent {
    const tokens = this.markedInstance.lexer(markdown) as QuireMarkdownToken[];
    const content = this.parseTokens(tokens);

    return {
      type: "doc",
      ...(content.length === 0 ? {} : { content })
    };
  }

  /**
   * Serializes Tiptap-compatible JSON to Markdown.
   *
   * @param content - JSON node or document content.
   * @returns Markdown string.
   */
  serialize(content: QuireMarkdownJSONContent): string {
    const markdown = this.renderNode(content);

    return isEmptyMarkdown(markdown) ? "" : markdown;
  }

  /**
   * Registers one tokenizer with marked.
   *
   * @param tokenizer - Tokenizer contributed by an extension.
   */
  private registerTokenizer(tokenizer: QuireMarkdownTokenizer): void {
    const helper = {
      inlineTokens: (source: string) =>
        this.lexer.inlineTokens(source) as QuireMarkdownToken[],
      blockTokens: (source: string) =>
        this.lexer.blockTokens(source) as QuireMarkdownToken[]
    };
    const start = typeof tokenizer.start === "function"
      ? tokenizer.start
      : tokenizer.start
        ? (source: string) => source.indexOf(tokenizer.start as string)
        : (source: string) => {
          const token = tokenizer.tokenize(source, [], helper);

          return token?.raw ? source.indexOf(token.raw) : -1;
        };

    this.markedInstance.use({
      extensions: [
        {
          name: tokenizer.name,
          level: tokenizer.level ?? "inline",
          start,
          tokenizer: (source: string, tokens: unknown[]): Tokens.Generic | undefined => {
            const token = tokenizer.tokenize(
              source,
              tokens as QuireMarkdownToken[],
              helper
            );
            const type = token?.type;

            if (!type) {
              return undefined;
            }

            return {
              ...token,
              type,
              raw: token.raw ?? "",
              tokens: (token.tokens ?? []) as QuireMarkedToken[]
            } as unknown as Tokens.Generic;
          },
          childTokens: []
        }
      ]
    });
  }

  /**
   * Parses a token list into JSON content.
   *
   * @param tokens - Markdown tokens.
   * @returns Parsed JSON content.
   */
  private parseTokens(tokens: readonly QuireMarkdownToken[]): QuireMarkdownJSONContent[] {
    const nodes: QuireMarkdownJSONContent[] = [];

    for (const token of tokens) {
      const parsed = this.parseToken(token);

      if (!parsed) {
        continue;
      }

      if (Array.isArray(parsed)) {
        nodes.push(...parsed);
        continue;
      }

      nodes.push(parsed);
    }

    return nodes;
  }

  /**
   * Parses one Markdown token.
   *
   * @param token - Token to parse.
   * @returns Parsed JSON content, or null.
   */
  private parseToken(
    token: QuireMarkdownToken
  ): QuireMarkdownJSONContent | QuireMarkdownJSONContent[] | null {
    if (!token.type || token.type === "space") {
      return null;
    }

    for (const handler of this.parseRegistry.get(token.type) ?? []) {
      if (!handler.parseMarkdown) {
        continue;
      }

      const result = this.normalizeParseResult(
        handler.parseMarkdown(token, this.createParseHelpers())
      );

      if (result && (!Array.isArray(result) || result.length > 0)) {
        return result;
      }
    }

    return this.parseFallbackToken(token);
  }

  /**
   * Creates helpers passed to extension parse handlers.
   *
   * @returns Parse helpers.
   */
  private createParseHelpers(): QuireMarkdownParseHelpers {
    return {
      parseInline: (tokens) => this.parseInlineTokens(tokens),
      parseChildren: (tokens) => this.parseTokens(tokens),
      createTextNode: (text, marks) => createTextNode(text, marks ?? []),
      createNode: (type, attrs, content) => ({
        type,
        ...(attrs && Object.keys(attrs).length > 0 ? { attrs } : {}),
        ...(content && content.length > 0 ? { content } : {})
      }),
      applyMark: (markType, content, attrs) => ({
        mark: markType,
        content,
        ...(attrs && Object.keys(attrs).length > 0 ? { attrs } : {})
      })
    };
  }

  /**
   * Parses inline tokens and applies inline marks.
   *
   * @param tokens - Inline tokens.
   * @returns Parsed inline JSON content.
   */
  private parseInlineTokens(
    tokens: readonly QuireMarkdownToken[]
  ): QuireMarkdownJSONContent[] {
    const nodes: QuireMarkdownJSONContent[] = [];

    for (const token of tokens) {
      if (!token.type) {
        continue;
      }

      if (token.type === "strong") {
        nodes.push(...this.parseInlineTokensWithMark(token, "bold"));
        continue;
      }

      if (token.type === "em") {
        nodes.push(...this.parseInlineTokensWithMark(token, "italic"));
        continue;
      }

      const parsed = this.parseInlineTokenWithHandlers(token);
      if (parsed) {
        nodes.push(...parsed);
        continue;
      }

      if (token.type === "br") {
        nodes.push(createTextNode("\n", []));
        continue;
      }

      if (token.tokens && token.tokens.length > 0) {
        nodes.push(...this.parseInlineTokens(token.tokens));
        continue;
      }

      nodes.push(createTextNode(token.text ?? token.raw ?? "", []));
    }

    return mergeAdjacentTextNodes(nodes);
  }

  /**
   * Parses inline content wrapped by a fallback mark.
   *
   * @param token - Source token.
   * @param markType - Mark type name.
   * @returns Marked inline content.
   */
  private parseInlineTokensWithMark(
    token: QuireMarkdownToken,
    markType: string
  ): QuireMarkdownJSONContent[] {
    const content = this.parseInlineTokens(token.tokens ?? createTextToken(token.text));

    return applyMarkToContent(markType, content);
  }

  /**
   * Parses an inline token with registered extension handlers.
   *
   * @param token - Inline token.
   * @returns Parsed inline content, or undefined.
   */
  private parseInlineTokenWithHandlers(
    token: QuireMarkdownToken
  ): QuireMarkdownJSONContent[] | undefined {
    for (const handler of this.parseRegistry.get(token.type ?? "") ?? []) {
      if (!handler.parseMarkdown) {
        continue;
      }

      const result = handler.parseMarkdown(token, this.createParseHelpers());

      if (isMarkResult(result)) {
        return applyMarkToContent(result.mark, result.content, result.attrs);
      }

      const normalized = this.normalizeParseResult(result);

      if (Array.isArray(normalized)) {
        return normalized;
      }

      if (normalized) {
        return [normalized];
      }
    }

    return undefined;
  }

  /**
   * Normalizes an extension parse result.
   *
   * @param result - Parse result.
   * @returns JSON node, node array, or null.
   */
  private normalizeParseResult(
    result: QuireMarkdownParseResult | undefined
  ): QuireMarkdownJSONContent | QuireMarkdownJSONContent[] | null {
    if (!result) {
      return null;
    }

    if (isMarkResult(result)) {
      return result.content;
    }

    return result;
  }

  /**
   * Parses common Markdown tokens when no extension handler exists.
   *
   * @param token - Token to parse.
   * @returns Parsed JSON content, or null.
   */
  private parseFallbackToken(
    token: QuireMarkdownToken
  ): QuireMarkdownJSONContent | QuireMarkdownJSONContent[] | null {
    if (token.type === "paragraph" || token.type === "heading") {
      return createParagraphNode(this.parseInlineTokens(token.tokens ?? createTextToken(token.text)));
    }

    if (token.type === "text") {
      return createTextNode(token.text ?? token.raw ?? "", []);
    }

    if (token.tokens && token.tokens.length > 0) {
      return this.parseTokens(token.tokens);
    }

    return createParagraphNode([
      createTextNode(token.text ?? token.raw ?? "", [])
    ]);
  }

  /**
   * Renders one JSON node or node array.
   *
   * @param nodeOrNodes - Node or nodes to render.
   * @param parent - Parent node when available.
   * @param separator - Separator used between sibling nodes.
   * @param level - Indentation level.
   * @returns Rendered Markdown.
   */
  private renderNode(
    nodeOrNodes: QuireMarkdownJSONContent | readonly QuireMarkdownJSONContent[],
    parent?: QuireMarkdownJSONContent | undefined,
    separator = "",
    level = 0
  ): string {
    if (Array.isArray(nodeOrNodes)) {
      return nodeOrNodes
        .map((node, index) => this.renderSingleNode(node, parent, index, level))
        .join(separator);
    }

    return this.renderSingleNode(
      nodeOrNodes as QuireMarkdownJSONContent,
      parent,
      0,
      level
    );
  }

  /**
   * Renders a single JSON node.
   *
   * @param node - Node to render.
   * @param parent - Parent node when available.
   * @param index - Child index.
   * @param level - Indentation level.
   * @returns Rendered Markdown.
   */
  private renderSingleNode(
    node: QuireMarkdownJSONContent,
    parent: QuireMarkdownJSONContent | undefined,
    index: number,
    level: number
  ): string {
    if (node.type === "doc") {
      return this.renderNode(node.content ?? [], node, "\n\n", level);
    }

    if (node.type === "text") {
      return this.renderTextNode(node);
    }

    const context: QuireMarkdownRenderContext = {
      index,
      level,
      parentType: parent?.type ?? null,
      meta: {
        parentAttrs: parent?.attrs
      }
    };
    const handler = this.renderRegistry.get(node.type ?? "")?.[0];
    let output: string;

    if (handler?.renderMarkdown) {
      const helpers = this.createRenderHelpers(handler, node, index, level);
      output = handler.renderMarkdown(node, helpers, context);
    } else {
      output = this.renderNode(node.content ?? [], node);
    }

    return this.applyRenderTransforms(node, output, context);
  }

  /**
   * Applies behavior-extension transforms after normal node rendering.
   *
   * Keeping transforms outside the renderer registry lets an extension enrich
   * an existing node's semantics without taking ownership of its child or mark
   * serialization.
   *
   * @param node - JSON node whose default output has been rendered.
   * @param output - Default rendered Markdown.
   * @param context - Rendering context for the node.
   * @returns Markdown after all transforms run in registration order.
   */
  private applyRenderTransforms(
    node: QuireMarkdownJSONContent,
    output: string,
    context: QuireMarkdownRenderContext
  ): string {
    return (this.transformRegistry.get(node.type ?? "") ?? []).reduce(
      (current, transform) =>
        transform.transformMarkdown?.(node, current, context) ?? current,
      output
    );
  }

  /**
   * Creates helpers passed to extension render handlers.
   *
   * @param handler - Active Markdown spec.
   * @param parent - Parent node used for child rendering.
   * @param _index - Child index reserved for extension helper ABI compatibility.
   * @param level - Current indentation level.
   * @returns Render helpers.
   */
  private createRenderHelpers(
    handler: QuireMarkdownExtensionSpec,
    parent: QuireMarkdownJSONContent,
    _index: number,
    level: number
  ): QuireMarkdownRendererHelpers {
    return {
      renderChildren: (nodes, separator) =>
        this.renderNode(
          nodes,
          parent,
          separator ?? "",
          handler.isIndenting ? level + 1 : level
        ),
      wrapInBlock,
      indent: (content) => `${this.indentString}${content}`
    };
  }

  /**
   * Renders one text node and its marks.
   *
   * @param node - Text node to render.
   * @returns Rendered Markdown text.
   */
  private renderTextNode(node: QuireMarkdownJSONContent): string {
    let text = escapeMarkdownText(node.text ?? "");

    for (const mark of [...(node.marks ?? [])].reverse()) {
      text = this.renderMark(mark, text);
    }

    return text;
  }

  /**
   * Renders one mark around already-rendered text.
   *
   * @param mark - Mark to render.
   * @param text - Rendered inner text.
   * @returns Text wrapped by the mark renderer.
   */
  private renderMark(mark: QuireMarkdownJSONMark, text: string): string {
    const handler = this.renderRegistry.get(mark.type)?.[0];

    if (handler?.renderMarkdown) {
      return handler.renderMarkdown(
        {
          type: mark.type,
          attrs: mark.attrs ?? {},
          content: [{ type: "text", text }]
        },
        {
          renderChildren: () => text,
          wrapInBlock,
          indent: (content) => content
        },
        {
          index: 0,
          level: 0,
          parentType: "text"
        }
      );
    }

    if (mark.type === "bold") {
      return `**${text}**`;
    }

    if (mark.type === "italic") {
      return `*${text}*`;
    }

    return text;
  }
}

/**
 * Parses Markdown into Tiptap-compatible JSON with a temporary manager.
 *
 * @param markdown - Markdown source string.
 * @param options - Optional manager options.
 * @returns JSON document content.
 */
export function parseMarkdown(
  markdown: string,
  options: QuireMarkdownManagerOptions = {}
): QuireMarkdownJSONContent {
  return new MarkdownManager(options).parse(markdown);
}

/**
 * Serializes Tiptap-compatible JSON to Markdown with a temporary manager.
 *
 * @param content - JSON node or document content.
 * @param options - Optional manager options.
 * @returns Markdown string.
 */
export function serializeMarkdown(
  content: QuireMarkdownJSONContent,
  options: QuireMarkdownManagerOptions = {}
): string {
  return new MarkdownManager(options).serialize(content);
}

/**
 * Creates a paragraph node, omitting empty content.
 *
 * @param content - Paragraph inline content.
 * @returns JSON paragraph node.
 */
function createParagraphNode(
  content: readonly QuireMarkdownJSONContent[]
): QuireMarkdownJSONContent {
  return {
    type: "paragraph",
    ...(content.length === 0 ? {} : { content: [...content] })
  };
}

/**
 * Creates a text node with optional marks.
 *
 * @param text - Text content.
 * @param marks - Marks applied to the text.
 * @returns JSON text node.
 */
function createTextNode(
  text: string,
  marks: readonly QuireMarkdownJSONMark[]
): QuireMarkdownJSONContent {
  return {
    type: "text",
    text,
    ...(marks.length === 0 ? {} : { marks: marks.map((mark) => ({ ...mark })) })
  };
}

/**
 * Creates a fallback text token array.
 *
 * @param text - Optional fallback text.
 * @returns One token when text exists, otherwise an empty array.
 */
function createTextToken(text: string | undefined): QuireMarkdownToken[] {
  return text ? [{ type: "text", text }] : [];
}

/**
 * Applies a mark to text nodes in content.
 *
 * @param markType - Mark type to apply.
 * @param content - Content receiving the mark.
 * @param attrs - Optional mark attributes.
 * @returns Marked content.
 */
function applyMarkToContent(
  markType: string,
  content: readonly QuireMarkdownJSONContent[],
  attrs?: Record<string, unknown> | undefined
): QuireMarkdownJSONContent[] {
  return content.map((node) => {
    if (node.type === "text") {
      return {
        ...node,
        marks: [
          ...(node.marks ?? []),
          {
            type: markType,
            ...(attrs && Object.keys(attrs).length > 0 ? { attrs } : {})
          }
        ]
      };
    }

    return {
      ...node,
      ...(node.content
        ? { content: applyMarkToContent(markType, node.content, attrs) }
        : {})
    };
  });
}

/**
 * Checks whether a parse result is a mark application result.
 *
 * @param result - Parse result to inspect.
 * @returns Whether the result describes a mark application.
 */
function isMarkResult(
  result: QuireMarkdownParseResult | undefined
): result is QuireMarkdownMarkParseResult {
  return !!result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    "mark" in result;
}

/**
 * Merges adjacent text nodes with identical mark sets.
 *
 * @param nodes - Inline nodes to merge.
 * @returns Merged inline nodes.
 */
function mergeAdjacentTextNodes(
  nodes: readonly QuireMarkdownJSONContent[]
): QuireMarkdownJSONContent[] {
  const merged: QuireMarkdownJSONContent[] = [];

  for (const node of nodes) {
    const previous = merged.at(-1);

    if (
      previous?.type === "text" &&
      node.type === "text" &&
      sameMarks(previous.marks, node.marks)
    ) {
      merged[merged.length - 1] = {
        ...previous,
        text: `${previous.text ?? ""}${node.text ?? ""}`
      };
      continue;
    }

    if (node.type !== "text" || node.text !== "") {
      merged.push(node);
    }
  }

  return merged;
}

/**
 * Checks whether two mark arrays describe the same mark set.
 *
 * @param left - First mark array.
 * @param right - Second mark array.
 * @returns Whether both mark arrays are equivalent.
 */
function sameMarks(
  left: readonly QuireMarkdownJSONMark[] | undefined,
  right: readonly QuireMarkdownJSONMark[] | undefined
): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

/**
 * Escapes Markdown control characters in plain text.
 *
 * @param text - Text to escape.
 * @returns Escaped Markdown text.
 */
function escapeMarkdownText(text: string): string {
  return (
    text
      // Inline constructs, anywhere in the text.
      .replace(/[\\`*_[\]~]/g, "\\$&")
      // Block constructs only matter at the start of a block; a text node that
      // opens one would otherwise re-parse as a heading, blockquote, or list.
      .replace(/^(\s*)([#>+-])/, "$1\\$2")
      .replace(/^(\s*\d+)([.)])/, "$1\\$2")
  );
}

/**
 * Wraps content with a Markdown block prefix.
 *
 * @param prefix - Prefix for every emitted line.
 * @param content - Content to wrap.
 * @returns Wrapped Markdown content.
 */
function wrapInBlock(prefix: string, content: string): string {
  return content
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

/**
 * Checks whether rendered Markdown represents an empty document.
 *
 * @param markdown - Rendered Markdown source.
 * @returns Whether the output is empty.
 */
function isEmptyMarkdown(markdown: string): boolean {
  return markdown
    .replace(/&nbsp;/g, "")
    .replace(/\u00A0/g, "")
    .trim() === "";
}
