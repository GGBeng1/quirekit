import {
  Fragment,
  Slice,
  type Mark,
  type MarkType,
  type Node as ProseMirrorNode,
  type Schema
} from "@quirekit/pm";
import { decodeHtmlEntities } from "./entities";
import { parseHtmlTagToken } from "./tag-token";

const htmlTokenPattern = /<[^>]+>|[^<]+/g;
const blockHtmlTags = new Set(["address", "article", "aside", "blockquote", "div", "li", "p", "section"]);
const strongHtmlTags = new Set(["b", "strong"]);
const emphasisHtmlTags = new Set(["em", "i"]);

/**
 * Parses basic semantic HTML in non-DOM runtimes used by unit tests.
 *
 * @param html - Sanitized clipboard HTML.
 * @param schema - Schema used to create text nodes and marks.
 * @returns Parsed slice, or null when no text content could be recovered.
 */
export function parseSimpleSemanticHtmlSlice(html: string, schema: Schema): Slice | null {
  const nodes: ProseMirrorNode[] = [];
  const activeMarks: Mark[] = [];
  const tokens = html.match(htmlTokenPattern) ?? [];

  for (const token of tokens) {
    if (token.startsWith("<")) {
      handleSimpleHtmlTag(token, schema, nodes, activeMarks);
      continue;
    }

    appendSimpleHtmlText(nodes, schema, token, activeMarks);
  }

  const fragment = Fragment.fromArray(nodes);

  return fragment.size > 0 ? new Slice(fragment, 0, 0) : null;
}

/**
 * Applies a single HTML tag token to fallback parser state.
 *
 * @param token - HTML tag token.
 * @param schema - Schema used to resolve semantic marks.
 * @param nodes - Accumulated text nodes.
 * @param activeMarks - Mutable active mark stack.
 */
function handleSimpleHtmlTag(
  token: string,
  schema: Schema,
  nodes: ProseMirrorNode[],
  activeMarks: Mark[]
): void {
  const tag = parseHtmlTagToken(token);

  if (!tag) {
    return;
  }

  if (tag.closing) {
    closeSimpleHtmlMark(tag.name, activeMarks);
    return;
  }

  if (tag.name === "br") {
    appendSimpleLineBreak(nodes, schema, activeMarks);
    return;
  }

  if (blockHtmlTags.has(tag.name)) {
    if (nodes.length > 0 && !lastTextNodeEndsWith(nodes, "\n")) {
      appendSimpleLineBreak(nodes, schema, activeMarks);
    }

    return;
  }

  const markType = semanticMarkType(schema, tag.name);

  if (markType && !activeMarks.some((mark) => mark.type === markType)) {
    activeMarks.push(markType.create());
  }
}

/**
 * Appends decoded text for a fallback HTML parser token.
 *
 * @param nodes - Accumulated text nodes.
 * @param schema - Schema used to create text nodes.
 * @param text - Raw HTML text token.
 * @param activeMarks - Active mark stack to apply to the text.
 */
function appendSimpleHtmlText(
  nodes: ProseMirrorNode[],
  schema: Schema,
  text: string,
  activeMarks: readonly Mark[]
): void {
  const decoded = decodeHtmlEntities(text).replace(/\s+/g, " ");

  if (decoded.length === 0) {
    return;
  }

  nodes.push(schema.text(decoded, activeMarks.slice()));
}

/**
 * Appends a line break to fallback text parsing when needed.
 *
 * @param nodes - Accumulated text nodes.
 * @param schema - Schema used to create text nodes.
 * @param activeMarks - Active mark stack to apply to the line break.
 */
function appendSimpleLineBreak(
  nodes: ProseMirrorNode[],
  schema: Schema,
  activeMarks: readonly Mark[]
): void {
  if (nodes.length === 0 || lastTextNodeEndsWith(nodes, "\n")) {
    return;
  }

  nodes.push(schema.text("\n", activeMarks.slice()));
}

/**
 * Closes the matching semantic mark in fallback parser state.
 *
 * @param tagName - Closing HTML tag name.
 * @param activeMarks - Mutable active mark stack.
 */
function closeSimpleHtmlMark(tagName: string, activeMarks: Mark[]): void {
  const predicate = strongHtmlTags.has(tagName)
    ? (mark: Mark) => mark.type.name === "strong" || mark.type.name === "bold"
    : emphasisHtmlTags.has(tagName)
      ? (mark: Mark) => mark.type.name === "em" || mark.type.name === "italic"
      : undefined;

  if (!predicate) {
    return;
  }

  for (let index = activeMarks.length - 1; index >= 0; index -= 1) {
    const activeMark = activeMarks[index];

    if (activeMark && predicate(activeMark)) {
      activeMarks.splice(index, 1);
      return;
    }
  }
}

/**
 * Resolves a semantic HTML tag to a schema mark type.
 *
 * @param schema - Schema that may provide semantic mark types.
 * @param tagName - Lowercase HTML tag name.
 * @returns Matching mark type, or null when the schema has no equivalent.
 */
function semanticMarkType(schema: Schema, tagName: string): MarkType | null {
  if (strongHtmlTags.has(tagName)) {
    return schema.marks.strong ?? schema.marks.bold ?? null;
  }

  if (emphasisHtmlTags.has(tagName)) {
    return schema.marks.em ?? schema.marks.italic ?? null;
  }

  return null;
}

/**
 * Checks whether the last accumulated text node ends with a value.
 *
 * @param nodes - Accumulated text nodes.
 * @param value - Text suffix to check.
 * @returns Whether the last node ends with the requested value.
 */
function lastTextNodeEndsWith(nodes: readonly ProseMirrorNode[], value: string): boolean {
  const lastNode = nodes[nodes.length - 1];

  return lastNode?.isText === true && (lastNode.text ?? "").endsWith(value);
}
