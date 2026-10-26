import type {
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  MarkdownToken,
  MarkdownTokenizer,
  QuireJSONContent
} from "@quirekit/core";
import {
  buildNestedStructure,
  collectOrderedListItems,
  parseListItems
} from "./utils";

/** Markdown token shape used by ordered list parsers. */
interface OrderedListMarkdownToken extends MarkdownToken {
  /** Whether the list token is ordered. */
  readonly ordered?: boolean | undefined;
  /** Ordered list start number. */
  readonly start?: number | undefined;
  /** List item child tokens. */
  readonly items?: readonly MarkdownToken[] | undefined;
}

/**
 * Parses an ordered Markdown list token into an orderedList JSON node.
 *
 * @param token - Markdown token to parse.
 * @param helpers - Markdown parse helpers.
 * @returns Parsed ordered list node, or an empty list when skipped.
 */
export function parseOrderedListMarkdown(
  token: MarkdownToken,
  helpers: MarkdownParseHelpers
): MarkdownParseResult {
  const listToken = token as OrderedListMarkdownToken;

  if (listToken.type !== "list" || !listToken.ordered) {
    return [];
  }

  const startValue = listToken.start || 1;
  const content = listToken.items ? parseListItems(listToken.items, helpers) : [];

  return helpers.createNode(
    "orderedList",
    startValue !== 1 ? { start: startValue } : undefined,
    content
  );
}

/**
 * Serializes an orderedList JSON node into Markdown.
 *
 * @param node - Ordered list JSON node.
 * @param helpers - Markdown render helpers.
 * @returns Markdown for the ordered list.
 */
export function renderOrderedListMarkdown(
  node: QuireJSONContent,
  helpers: MarkdownRendererHelpers
): string {
  if (!node.content) {
    return "";
  }

  return helpers.renderChildren(node.content, "\n");
}

/** Tokenizer used to preserve ordered-list start numbers and nesting. */
export const orderedListMarkdownTokenizer: MarkdownTokenizer = {
  name: "orderedList",
  level: "block",
  start: (source: string) => {
    const match = source.match(/^(\s*)(\d+)\.\s+/);
    const index = match?.index;

    return index !== undefined ? index : -1;
  },
  tokenize: (source: string, _tokens, lexer) => {
    const lines = source.split("\n");
    const [listItems, consumed] = collectOrderedListItems(lines);

    if (listItems.length === 0) {
      return undefined;
    }

    const items = buildNestedStructure(listItems, 0, lexer);

    if (items.length === 0) {
      return undefined;
    }

    return {
      type: "list",
      ordered: true,
      start: listItems[0]?.number || 1,
      items,
      raw: lines.slice(0, consumed).join("\n")
    } as MarkdownToken;
  }
};
