import { DOMParser as PMDOMParser } from "@quirekit/pm";
import type { QuireAnyExtension, QuireJSONContent } from "../types";
import { elementFromString } from "../utilities/elementFromString";
import { getSchema } from "./getSchema";

/**
 * Generates JSON content from HTML and extensions.
 *
 * @param html - HTML content to parse.
 * @param extensions - Extensions used to build the schema.
 * @returns JSON document content.
 */
export function generateJSON(
  html: string,
  extensions: readonly QuireAnyExtension[]
): QuireJSONContent {
  const schema = getSchema(extensions);

  return PMDOMParser.fromSchema(schema).parse(elementFromString(html)).toJSON() as QuireJSONContent;
}
