import type {
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  MarkdownToken,
  MarkdownTokenizer,
  QuireJSONContent
} from "../../types";
import {
  parseAttributes as defaultParseAttributes,
  serializeAttributes as defaultSerializeAttributes
} from "./attributeUtils";
import { filterAllowedAttributes } from "./shared";

/** Options used to create a container block Markdown spec. */
export interface BlockMarkdownSpecOptions {
  /** Tiptap node name represented by the spec. */
  readonly nodeName: string;
  /** Markdown block name used in source text. */
  readonly name?: string | undefined;
  /**
   * Extracts content from a Markdown token.
   *
   * @param token - Token being parsed.
   * @returns Text or JSON content for the node.
   */
  readonly getContent?: ((token: MarkdownToken) => string | QuireJSONContent[]) | undefined;
  /**
   * Parses block attributes.
   *
   * @param attrString - Raw attribute string.
   * @returns Parsed attributes.
   */
  readonly parseAttributes?: ((attrString: string) => Record<string, unknown>) | undefined;
  /**
   * Serializes block attributes.
   *
   * @param attrs - Attributes to serialize.
   * @returns Serialized attribute string.
   */
  readonly serializeAttributes?: ((attrs: Record<string, unknown>) => string) | undefined;
  /** Attributes applied before parsed attributes. */
  readonly defaultAttributes?: Record<string, unknown> | undefined;
  /** Whether nested content should parse as block or inline content. */
  readonly content?: "block" | "inline" | undefined;
  /** Attributes allowed during serialization. */
  readonly allowedAttributes?: readonly string[] | undefined;
}

/**
 * Creates a Tiptap-compatible container block Markdown spec.
 *
 * @param options - Container block options.
 * @returns Parser, tokenizer, and renderer for the block spec.
 */
export function createBlockMarkdownSpec(options: BlockMarkdownSpecOptions): {
  /** Parses a tokenizer token into JSON content. */
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult;
  /** Tokenizer consumed by marked-compatible Markdown managers. */
  markdownTokenizer: MarkdownTokenizer;
  /** Serializes JSON content to Markdown. */
  renderMarkdown: (node: QuireJSONContent, helpers: MarkdownRendererHelpers) => string;
} {
  const blockName = options.name ?? options.nodeName;
  const parseAttributes = options.parseAttributes ?? defaultParseAttributes;
  const serializeAttributes = options.serializeAttributes ?? defaultSerializeAttributes;
  const defaultAttributes = options.defaultAttributes ?? {};
  const contentKind = options.content ?? "block";

  return {
    parseMarkdown: (token, helpers) => {
      const content = getBlockContent(token, helpers, options.getContent, contentKind);

      return helpers.createNode(
        options.nodeName,
        { ...defaultAttributes, ...(token.attributes ?? {}) },
        content
      );
    },
    markdownTokenizer: {
      name: options.nodeName,
      level: "block",
      start(source) {
        const index = source.match(new RegExp(`^:::${blockName}`, "m"))?.index;

        return index ?? -1;
      },
      tokenize(source, _tokens, lexer) {
        const openingMatch = source.match(
          new RegExp(`^:::${blockName}(?:\\s+\\{([^}]*)\\})?\\s*\\n`)
        );

        if (!openingMatch) {
          return undefined;
        }

        const rawOpening = openingMatch[0];
        const attributes = parseAttributes(openingMatch[1] ?? "");
        const remaining = source.slice(rawOpening.length);
        const closing = findClosingFence(remaining);

        if (!closing) {
          return undefined;
        }

        const rawContent = remaining.slice(0, closing.index);
        const content = rawContent.trim();
        const tokens = contentKind === "block"
          ? lexer.blockTokens(rawContent)
          : lexer.inlineTokens(content);

        return {
          type: options.nodeName,
          raw: source.slice(0, rawOpening.length + closing.index + closing.raw.length),
          attributes,
          content,
          tokens
        };
      }
    },
    renderMarkdown: (node, helpers) => {
      const attrs = serializeAttributes(filterAllowedAttributes(
        node.attrs ?? {},
        options.allowedAttributes
      ));
      const attrString = attrs ? ` {${attrs}}` : "";
      const renderedContent = helpers.renderChildren(node.content ?? [], "\n\n");

      return `:::${blockName}${attrString}\n\n${renderedContent}\n\n:::`;
    }
  };
}

/**
 * Resolves block content from explicit extractor or helper parsing.
 *
 * @param token - Source Markdown token.
 * @param helpers - Parse helpers.
 * @param getContent - Optional custom content extractor.
 * @param contentKind - Child parsing mode.
 * @returns JSON content array.
 */
function getBlockContent(
  token: MarkdownToken,
  helpers: MarkdownParseHelpers,
  getContent: BlockMarkdownSpecOptions["getContent"],
  contentKind: "block" | "inline"
): QuireJSONContent[] {
  if (getContent) {
    const content = getContent(token);

    return typeof content === "string"
      ? [helpers.createTextNode(content)]
      : content;
  }

  return contentKind === "block"
    ? helpers.parseChildren(token.tokens ?? [])
    : helpers.parseInline(token.tokens ?? []);
}

/**
 * Finds the matching closing fence for a Pandoc-style container block.
 *
 * @param source - Source after the opening fence.
 * @returns Closing fence position and raw text.
 */
function findClosingFence(source: string): { readonly index: number; readonly raw: string } | undefined {
  let level = 1;
  const fencePattern = /^:::([\w-]*)(\s.*)?/gm;

  for (;;) {
    const match = fencePattern.exec(source);

    if (!match) {
      return undefined;
    }

    const blockType = match[1] ?? "";
    const trailing = match[2] ?? "";

    if (trailing.endsWith(":::")) {
      continue;
    }

    if (blockType) {
      level += 1;
      continue;
    }

    level -= 1;
    if (level === 0) {
      return {
        index: match.index,
        raw: match[0]
      };
    }
  }
}
