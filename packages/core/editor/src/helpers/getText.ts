import type { Node as PMNode } from "@quirekit/pm";
import { getTextBetween, type GetTextBetweenOptions } from "./getTextBetween";

/**
 * Serializes a ProseMirror node to plain text.
 *
 * @param node - Node to serialize.
 * @param options - Text serialization options.
 * @returns Serialized plain text.
 */
export function getText(node: PMNode, options: GetTextBetweenOptions = {}): string {
  return getTextBetween(node, { from: 0, to: node.content.size }, options);
}
