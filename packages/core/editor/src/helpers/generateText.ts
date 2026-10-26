import { Node as PMNode } from "@quirekit/pm";
import type { QuireAnyExtension, QuireJSONContent } from "../types";
import { getSchema } from "./getSchema";
import { getText } from "./getText";
import type { TextSerializer } from "./getTextBetween";

/** Options used while generating text from JSON content. */
export interface GenerateTextOptions {
  /** Text inserted between block nodes. */
  readonly blockSeparator?: string;
  /** Node-type-specific text serializers. */
  readonly textSerializers?: Readonly<Record<string, TextSerializer>>;
}

/**
 * Generates plain text from JSON content and extensions.
 *
 * @param doc - JSON document content.
 * @param extensions - Extensions used to build the schema.
 * @param options - Text serialization options.
 * @returns Plain text string.
 */
export function generateText(
  doc: QuireJSONContent,
  extensions: readonly QuireAnyExtension[],
  options: GenerateTextOptions = {}
): string {
  const schema = getSchema(extensions);
  const node = PMNode.fromJSON(schema, doc);

  return getText(node, options);
}
