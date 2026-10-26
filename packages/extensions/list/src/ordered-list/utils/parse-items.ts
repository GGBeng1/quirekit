import type {
  MarkdownParseHelpers,
  MarkdownToken,
  QuireJSONContent
} from "@quirekit/core";

/**
 * Parses ordered list item tokens into QuireKit JSON content.
 *
 * @param items - Markdown tokens representing list items.
 * @param helpers - Markdown parser helpers.
 * @returns Parsed list item JSON nodes.
 */
export function parseListItems(
  items: readonly MarkdownToken[],
  helpers: MarkdownParseHelpers
): QuireJSONContent[] {
  return items.map((item) => {
    if (item.type !== "list_item") {
      return helpers.parseChildren([item])[0] ?? helpers.createNode("listItem");
    }

    return helpers.createNode(
      "listItem",
      undefined,
      parseOrderedListItemTokenContent(item, helpers)
    ) as QuireJSONContent;
  });
}

/**
 * Parses the child tokens of one ordered Markdown list item.
 *
 * @param item - Markdown list item token.
 * @param helpers - Markdown parser helpers.
 * @returns Block content for the list item.
 */
function parseOrderedListItemTokenContent(
  item: MarkdownToken,
  helpers: MarkdownParseHelpers
): QuireJSONContent[] {
  const content: QuireJSONContent[] = [];

  for (const itemToken of item.tokens ?? []) {
    if (isKnownBlockToken(itemToken)) {
      content.push(...helpers.parseChildren([itemToken]));
    } else if (itemToken.type === "text" && itemToken.tokens) {
      content.push(
        helpers.createNode(
          "paragraph",
          undefined,
          helpers.parseChildren([itemToken])
        ) as QuireJSONContent
      );
    } else {
      content.push(...helpers.parseChildren([itemToken]));
    }
  }

  return content;
}

/**
 * Reports whether a token is already a block token handled by parseChildren.
 *
 * @param token - Markdown token to inspect.
 * @returns Whether the token can be parsed as a block child.
 */
function isKnownBlockToken(token: MarkdownToken): boolean {
  return (
    token.type === "paragraph" ||
    token.type === "list" ||
    token.type === "blockquote" ||
    token.type === "code"
  );
}
