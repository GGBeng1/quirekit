import type { MarkType, NodeType, Schema } from "@quirekit/pm";

/**
 * Resolves a node or mark type by name.
 *
 * @param name - Schema item name.
 * @param schema - Schema to inspect.
 * @returns Matching node or mark type, or null.
 */
export function getSchemaTypeByName(
  name: string,
  schema: Schema
): NodeType | MarkType | null {
  return schema.nodes[name] ?? schema.marks[name] ?? null;
}
