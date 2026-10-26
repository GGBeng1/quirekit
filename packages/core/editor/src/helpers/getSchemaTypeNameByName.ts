import type { Schema } from "@quirekit/pm";

/** Schema item family name. */
export type QuireSchemaTypeName = "node" | "mark";

/**
 * Resolves whether a schema name belongs to a node or mark.
 *
 * @param name - Schema item name.
 * @param schema - Schema to inspect.
 * @returns Schema family name, or null when not found.
 */
export function getSchemaTypeNameByName(
  name: string,
  schema: Schema
): QuireSchemaTypeName | null {
  if (schema.nodes[name]) {
    return "node";
  }

  if (schema.marks[name]) {
    return "mark";
  }

  return null;
}
