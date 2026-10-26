import { getSchema, type QuireJSONContent } from "@quirekit/core";
import {
  DOMSerializer,
  Fragment,
  Node as PMNode,
  type Schema
} from "@quirekit/pm";
import type { QuireHTMLDocumentProvider, QuireHTMLExtensions } from "./types";

/**
 * Serializes a ProseMirror fragment to HTML.
 *
 * @param fragment - Fragment to serialize.
 * @param schema - Schema used to create the DOM serializer.
 * @param provider - DOM document provider.
 * @returns Serialized HTML string.
 */
export function serializeFragmentToHTML(
  fragment: Fragment,
  schema: Schema,
  provider: QuireHTMLDocumentProvider
): string {
  const serialized = DOMSerializer.fromSchema(schema).serializeFragment(
    fragment,
    { document: provider.document }
  );
  const serializer = new provider.document.defaultView!.XMLSerializer();

  return serializer.serializeToString(serialized as unknown as Node);
}

/**
 * Serializes a ProseMirror node's content to HTML.
 *
 * @param node - ProseMirror node to serialize.
 * @param schema - Schema used to create the DOM serializer.
 * @param provider - DOM document provider.
 * @returns Serialized HTML string.
 */
export function serializeNodeToHTML(
  node: PMNode,
  schema: Schema,
  provider: QuireHTMLDocumentProvider
): string {
  return serializeFragmentToHTML(node.content, schema, provider);
}

/**
 * Generates HTML from JSON content and extensions.
 *
 * @param doc - JSON document content.
 * @param extensions - Extensions used to build the schema.
 * @param provider - DOM document provider.
 * @returns Serialized HTML string.
 */
export function serializeJSONToHTML(
  doc: QuireJSONContent,
  extensions: QuireHTMLExtensions,
  provider: QuireHTMLDocumentProvider
): string {
  const schema = getSchema(extensions);
  const node = PMNode.fromJSON(schema, doc);

  return serializeNodeToHTML(node, schema, provider);
}
