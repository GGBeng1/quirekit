import type {
  MarkdownRendererHelpers,
  QuireJSONContent,
  RenderContext
} from "../../types";

/** Prefix factory used by nested Markdown rendering. */
export type NestedMarkdownPrefix =
  | string
  | ((context: RenderContext | undefined) => string);

/**
 * Renders the first child on the prefixed line and indents remaining children.
 *
 * @param node - JSON node whose content should be rendered.
 * @param helpers - Markdown renderer helpers.
 * @param prefixOrGenerator - Static prefix or prefix factory.
 * @param context - Optional render context passed to prefix factories.
 * @returns Rendered Markdown.
 */
export function renderNestedMarkdownContent(
  node: QuireJSONContent,
  helpers: Pick<MarkdownRendererHelpers, "renderChildren" | "indent">,
  prefixOrGenerator: NestedMarkdownPrefix,
  context?: RenderContext | undefined
): string {
  const [firstChild, ...nestedChildren] = node.content ?? [];

  if (!firstChild) {
    return "";
  }

  const prefix = typeof prefixOrGenerator === "function"
    ? prefixOrGenerator(context)
    : prefixOrGenerator;
  const lines = [`${prefix}${helpers.renderChildren([firstChild])}`];

  for (const child of nestedChildren) {
    const rendered = helpers.renderChildren([child]);

    if (rendered) {
      lines.push(helpers.indent(rendered));
    }
  }

  return lines.join("\n");
}
