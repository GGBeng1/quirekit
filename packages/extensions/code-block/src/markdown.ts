import type {
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  QuireJSONContent,
} from "@quirekit/core";
import type { CodeBlockMarkdownToken } from "./types";

/**
 * Parses a Markdown code token into a codeBlock JSON node.
 *
 * @param token - Markdown token produced by the lexer.
 * @param helpers - Markdown parser helpers.
 * @returns Parsed code block JSON content, or an empty list when skipped.
 */
export function parseCodeBlockMarkdown(
  token: CodeBlockMarkdownToken,
  helpers: MarkdownParseHelpers
): MarkdownParseResult {
  if (
    token.raw?.startsWith("```") === false &&
    token.raw?.startsWith("~~~") === false &&
    token.codeBlockStyle !== "indented"
  ) {
    return [];
  }

  return helpers.createNode(
    "codeBlock",
    { language: token.lang || null },
    token.text ? [helpers.createTextNode(token.text)] : []
  );
}

/**
 * Serializes a codeBlock JSON node to fenced Markdown.
 *
 * @param node - JSON codeBlock node.
 * @param helpers - Markdown renderer helpers.
 * @returns Fenced Markdown code block.
 */
export function renderCodeBlockMarkdown(
  node: QuireJSONContent,
  helpers: MarkdownRendererHelpers
): string {
  const language = typeof node.attrs?.language === "string"
    ? node.attrs.language
    : "";

  if (!node.content) {
    return `\`\`\`${language}\n\n\`\`\``;
  }

  return [`\`\`\`${language}`, helpers.renderChildren(node.content), "```"].join("\n");
}
