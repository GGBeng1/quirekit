import type {
  Attrs,
  NodeType
} from "@quirekit/pm";

/**
 * Converts unknown command input into ProseMirror node attributes.
 *
 * @param attributes - Unknown command argument.
 * @returns Attribute object accepted by ProseMirror commands.
 */
export function toNodeAttrs(attributes: unknown): Attrs {
  return typeof attributes === "object" && attributes !== null
    ? { ...(attributes as Record<string, unknown>) }
    : {};
}

/**
 * Filters copied node attributes down to the target node schema.
 *
 * Tiptap copies attrs when toggling between textblock node types. QuireKit keeps
 * vendored ProseMirror's stricter attrs validation, so copied attrs from a
 * source node such as `codeBlock.language` must not be passed to a target node
 * such as `paragraph`.
 *
 * @param type - Target node type.
 * @param attributes - Candidate attributes.
 * @returns Attributes supported by the target node type.
 */
export function filterNodeAttributes(
  type: NodeType,
  attributes: Record<string, unknown>
): Record<string, unknown> {
  const allowedAttributes = Object.keys(type.attrs);

  if (allowedAttributes.length === 0) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes).filter(([name]) => name in type.attrs)
  );
}
