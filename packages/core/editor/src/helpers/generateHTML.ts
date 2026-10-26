import { Node as PMNode } from "@quirekit/pm";
import type { QuireAnyExtension, QuireJSONContent } from "../types";
import { getSchema } from "./getSchema";
import { getHTMLFromFragment } from "./getHTMLFromFragment";

/**
 * Generates HTML from JSON content and extensions.
 *
 * @param doc - JSON document content.
 * @param extensions - Extensions used to build the schema.
 * @returns HTML string.
 */
export function generateHTML(
  doc: QuireJSONContent,
  extensions: readonly QuireAnyExtension[]
): string {
  const schema = getSchema(extensions);
  const node = PMNode.fromJSON(schema, doc);

  return getHTMLFromFragment(node.content, schema);
}
