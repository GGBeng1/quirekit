import type { NodeType, Schema } from "@quirekit/pm";

/**
 * Resolves a node type by name or returns a provided node type.
 *
 * @param nameOrType - Node type name or object.
 * @param schema - Schema to inspect.
 * @returns Resolved node type.
 */
export function getNodeType(nameOrType: string | NodeType, schema: Schema): NodeType {
  if (typeof nameOrType !== "string") {
    return nameOrType;
  }

  const type = schema.nodes[nameOrType];
  if (!type) {
    throw new Error(`There is no node type named '${nameOrType}'.`);
  }

  return type;
}
