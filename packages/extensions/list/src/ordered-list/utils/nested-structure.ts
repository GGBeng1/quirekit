import type { MarkdownLexerConfiguration, MarkdownToken } from "@quirekit/core";
import type { OrderedListItem } from "./types";

/**
 * Builds nested Markdown list item tokens from a flat ordered-list item list.
 *
 * @param items - Flat ordered-list items.
 * @param baseIndent - Indentation level processed by this recursion level.
 * @param lexer - Markdown lexer used for nested inline and block parsing.
 * @returns Markdown list item tokens.
 */
export function buildNestedStructure(
  items: readonly OrderedListItem[],
  baseIndent: number,
  lexer: MarkdownLexerConfiguration
): MarkdownToken[] {
  const result: MarkdownToken[] = [];
  let currentIndex = 0;

  while (currentIndex < items.length) {
    const item = items[currentIndex];

    if (!item || item.indent !== baseIndent) {
      currentIndex += 1;
      continue;
    }

    const [tokens, nextIndex] = buildOneNestedItem(items, currentIndex, baseIndent, lexer);

    result.push({
      type: "list_item",
      raw: item.raw,
      tokens
    } as MarkdownToken);
    currentIndex = nextIndex;
  }

  return result;
}

/**
 * Builds tokens for one list item and its deeper nested items.
 *
 * @param items - Flat ordered-list items.
 * @param currentIndex - Index of the current item.
 * @param baseIndent - Indentation level processed by this recursion level.
 * @param lexer - Markdown lexer used for nested inline and block parsing.
 * @returns Item tokens and the next unconsumed index.
 */
function buildOneNestedItem(
  items: readonly OrderedListItem[],
  currentIndex: number,
  baseIndent: number,
  lexer: MarkdownLexerConfiguration
): [tokens: MarkdownToken[], nextIndex: number] {
  const item = items[currentIndex]!;
  const tokens = createOrderedListItemTokens(item, lexer);
  let lookAheadIndex = currentIndex + 1;
  const nestedItems: OrderedListItem[] = [];

  while (
    lookAheadIndex < items.length &&
    (items[lookAheadIndex]?.indent ?? 0) > baseIndent
  ) {
    nestedItems.push(items[lookAheadIndex]!);
    lookAheadIndex += 1;
  }

  if (nestedItems.length > 0) {
    const nextIndent = Math.min(...nestedItems.map((nestedItem) => nestedItem.indent));

    tokens.push({
      type: "list",
      ordered: true,
      start: nestedItems[0]?.number ?? 1,
      items: buildNestedStructure(nestedItems, nextIndent, lexer),
      raw: nestedItems.map((nestedItem) => nestedItem.raw).join("\n")
    } as MarkdownToken);
  }

  return [tokens, lookAheadIndex];
}

/**
 * Creates Markdown tokens for one ordered list item.
 *
 * @param item - Ordered list item metadata.
 * @param lexer - Markdown lexer.
 * @returns Tokens owned by the list item.
 */
function createOrderedListItemTokens(
  item: OrderedListItem,
  lexer: MarkdownLexerConfiguration
): MarkdownToken[] {
  const contentLines = item.content.split("\n");
  const mainText = contentLines[0]?.trim() || "";
  const tokens: MarkdownToken[] = [];

  if (mainText) {
    tokens.push({
      type: "paragraph",
      raw: mainText,
      tokens: lexer.inlineTokens(mainText)
    } as MarkdownToken);
  }

  const additionalContent = contentLines.slice(1).join("\n").trim();

  if (additionalContent) {
    tokens.push(...lexer.blockTokens(additionalContent));
  }

  return tokens;
}
