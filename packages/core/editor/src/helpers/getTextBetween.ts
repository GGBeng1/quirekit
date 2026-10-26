import type { Node as PMNode } from "@quirekit/pm";
import type { QuireRange, QuireTextSerializer } from "../types";

/** Text serializer callback used by static text helpers. */
export type TextSerializer = QuireTextSerializer;

/** Options used while serializing text. */
export interface GetTextBetweenOptions {
  /** Text inserted between block nodes. */
  readonly blockSeparator?: string;
  /** Node-type-specific text serializers. */
  readonly textSerializers?: Readonly<Record<string, TextSerializer>>;
}

/**
 * Serializes text between two positions in a ProseMirror node.
 *
 * @param startNode - Node to serialize from.
 * @param range - Range to serialize.
 * @param options - Text serialization options.
 * @returns Serialized text.
 */
export function getTextBetween(
  startNode: PMNode,
  range: QuireRange,
  options: GetTextBetweenOptions = {}
): string {
  const { from, to } = range;
  const blockSeparator = options.blockSeparator ?? "\n\n";
  const textSerializers = options.textSerializers ?? {};
  let text = "";

  startNode.nodesBetween(from, to, (node, pos, parent, index) => {
    if (node.isBlock && pos > from) {
      text += blockSeparator;
    }

    const serializer = textSerializers[node.type.name];
    if (serializer && parent) {
      text += serializer({ node, pos, parent, index, range });
      return false;
    }

    if (node.isText) {
      text += node.text?.slice(Math.max(from, pos) - pos, to - pos) ?? "";
    }

    return undefined;
  });

  return text;
}
