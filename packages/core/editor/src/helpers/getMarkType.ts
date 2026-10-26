import type { MarkType, Schema } from "@quirekit/pm";

/**
 * Resolves a mark type by name or returns a provided mark type.
 *
 * @param nameOrType - Mark type name or object.
 * @param schema - Schema to inspect.
 * @returns Resolved mark type.
 */
export function getMarkType(nameOrType: string | MarkType, schema: Schema): MarkType {
  if (typeof nameOrType !== "string") {
    return nameOrType;
  }

  const type = schema.marks[nameOrType];
  if (!type) {
    throw new Error(`There is no mark type named '${nameOrType}'.`);
  }

  return type;
}
