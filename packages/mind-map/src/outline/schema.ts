/** @param value - A JSON schema value. @returns The recursively frozen schema value. */
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Provider-neutral JSON Schema for createMindMapDocument input. Runtime validation
 * additionally bounds total nodes, depth and UTF-16 text size across the tree.
 */
export const mindMapOutlineSchema = freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "MindMapOutline",
  description: "A mind map topic and its ordered descendants. IDs, layout coordinates and document revisions are assigned by the application. At most 10000 topics and 64 child levels per document.",
  type: "object",
  additionalProperties: false,
  required: ["text", "children"],
  properties: {
    text: { type: "string", maxLength: 10000,
      pattern: "^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uD800-\\uDFFF\\uFFFE\\uFFFF]*$",
      description: "Literal Unicode topic text, including optional line breaks. At most 10000 UTF-16 code units per topic and 1000000 in the complete tree." },
    children: { type: "array", maxItems: 9999,
      description: "Child topics in display order. Use an empty array for a leaf.", items: { $ref: "#" } },
  },
} as const);
