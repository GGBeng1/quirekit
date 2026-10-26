import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  renderNestedMarkdownContent,
  type MarkdownParseResult,
  type MarkdownToken,
  type QuireJSONContent,
  type RenderContext
} from "@quirekit/core";
import type { ListItemOptions } from "../types";

/** Markdown token with nested block or inline tokens. */
interface ListItemMarkdownToken extends MarkdownToken {
  /** Nested tokens owned by this list item. */
  readonly tokens?: readonly MarkdownToken[] | undefined;
}

/** List item node extension. */
export const ListItem = Node.create<ListItemOptions>({
  name: "listItem",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "list-item", textNavigation: true }) }];
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: "bulletList",
      orderedListTypeName: "orderedList"
    };
  },

  content: "paragraph block*",

  defining: true,

  parseHTML() {
    return [{ tag: "li" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["li", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  markdownTokenName: "list_item",

  parseMarkdown: (token, helpers): MarkdownParseResult => {
    if (token.type !== "list_item") {
      return [];
    }

    return helpers.createNode(
      "listItem",
      undefined,
      parseListItemContent(token as ListItemMarkdownToken, helpers)
    );
  },

  renderMarkdown: (node: QuireJSONContent, helpers, context) =>
    renderNestedMarkdownContent(
      node,
      helpers,
      (renderContext) => createListItemMarkdownPrefix(renderContext),
      context
    ),

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor?.commands.splitListItem(this.name) ?? false,
      Tab: () => this.editor?.commands.sinkListItem(this.name) ?? false,
      "Shift-Tab": () => this.editor?.commands.liftListItem(this.name) ?? false
    };
  }
});

/**
 * Parses one Markdown list item into ProseMirror JSON block content.
 *
 * @param token - Markdown list item token.
 * @param helpers - Markdown parse helpers.
 * @returns Block content for the list item.
 */
function parseListItemContent(
  token: ListItemMarkdownToken,
  helpers: Parameters<NonNullable<typeof ListItem.parseMarkdown>>[1]
): QuireJSONContent[] {
  const tokens = token.tokens ?? [];

  if (tokens.length === 0) {
    return [helpers.createNode("paragraph", undefined, []) as QuireJSONContent];
  }

  const hasParagraphTokens = tokens.some((child) => child.type === "paragraph");

  if (hasParagraphTokens) {
    return helpers.parseChildren([...tokens]);
  }

  const [firstToken, ...remainingTokens] = tokens;

  if (firstToken?.type === "text" && firstToken.tokens && firstToken.tokens.length > 0) {
    return [
      helpers.createNode(
        "paragraph",
        undefined,
        helpers.parseInline([...firstToken.tokens])
      ) as QuireJSONContent,
      ...helpers.parseChildren(remainingTokens)
    ];
  }

  const content = helpers.parseChildren([...tokens]);

  return content.length > 0
    ? content
    : [helpers.createNode("paragraph", undefined, []) as QuireJSONContent];
}

/**
 * Creates the list item marker used when serializing nested Markdown.
 *
 * @param context - Render context from the Markdown serializer.
 * @returns Markdown prefix for one list item.
 */
function createListItemMarkdownPrefix(context: RenderContext | undefined): string {
  if (context?.parentType === "bulletList") {
    return "- ";
  }

  if (context?.parentType === "orderedList") {
    const parentAttrs = context.meta?.parentAttrs as
      | { readonly start?: unknown }
      | undefined;
    const start = typeof parentAttrs?.start === "number"
      ? parentAttrs.start
      : 1;

    return `${start + context.index}. `;
  }

  return "- ";
}
