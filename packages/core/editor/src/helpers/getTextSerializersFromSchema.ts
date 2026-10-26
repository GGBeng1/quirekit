import type { Schema } from "@quirekit/pm";
import type { QuireTextSerializer } from "../types";

/** Node spec shape carrying QuireKit text serializers. */
interface QuireTextSerializableNodeSpec {
  /** Optional node-specific text serializer. */
  readonly toText?: QuireTextSerializer | undefined;
}

/**
 * Gets node-specific text serializers from a ProseMirror schema.
 *
 * @param schema - Schema to inspect.
 * @returns Text serializers keyed by node type name.
 */
export function getTextSerializersFromSchema(
  schema: Schema
): Record<string, QuireTextSerializer> {
  return Object.fromEntries(
    Object.entries(schema.nodes)
      .filter(([, node]) => Boolean((node.spec as QuireTextSerializableNodeSpec).toText))
      .map(([name, node]) => [
        name,
        (node.spec as QuireTextSerializableNodeSpec).toText!
      ])
  );
}
