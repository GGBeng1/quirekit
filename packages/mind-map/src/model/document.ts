import { createMindMapNodeReader } from "./nodes";
import type { MindMapDocument, MindMapFloatingTopic, MindMapLayout } from "./types";
import { readRecord } from "./validation";
import { readMindMapAnnotations } from "../annotations/validation";
import { mindMapTopicIds } from "../annotations/references";

/**
 * Validates and detaches a bounded tree, freezing every persistent object.
 * @param input - Untrusted QuireKit source; vendor payloads are not accepted here.
 * @returns An immutable document with no caller-owned references.
 */
export function readMindMapDocument(input: unknown): MindMapDocument {
  const value = readRecord(input, ["version", "revision", "layout", "root", "floatingTopics", "annotations"], "document");
  if (![1, 2, 3, 4, 5, 6].includes(value.version as number) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) {
    throw new TypeError("document: unsupported version or revision");
  }
  if (value.version === 1 ? Object.hasOwn(value, "floatingTopics") : !Array.isArray(value.floatingTopics)) {
    throw new TypeError("document: floating topics require version 2 or later and an array");
  }
  if (!(value.version === 6 ? ["mind-map", "logical-right", "logical-left", "organization", "timeline"] : ["mind-map", "logical-right", "logical-left"]).includes(value.layout as string)) {
    throw new TypeError("document.layout: unsupported layout");
  }
  if ((value.version as number) < 4 && Object.hasOwn(value, "annotations")) throw new TypeError("document: annotations require version 4");
  const visit = createMindMapNodeReader((value.version as number) >= 3, (value.version as number) >= 5);
  const root = visit(value.root, 0);
  /** @param candidate - Untrusted independent tree. @returns Validated frozen tree and position. */
  function readFloating(candidate: unknown): MindMapFloatingTopic {
    const topic = readRecord(candidate, ["root", "position", "side"], "floatingTopic");
    const position = readRecord(topic.position, ["x", "y"], "floatingTopic.position");
    if (![position.x, position.y].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10000000)
      || !["left", "right"].includes(topic.side as string)) throw new TypeError("floatingTopic: invalid position or side");
    return Object.freeze({ root: visit(topic.root, 0, true),
      position: Object.freeze({ x: position.x as number, y: position.y as number }), side: topic.side as "left" | "right" });
  }
  const floatingTopics = value.version === 1 ? [] : Array.from(value.floatingTopics as unknown[], readFloating);
  const topics = mindMapTopicIds([root, ...floatingTopics.map(topic => topic.root)]);
  return Object.freeze({ version: value.version as MindMapDocument["version"], revision: value.revision as number,
    layout: value.layout as MindMapLayout, root,
    ...(value.version !== 1 ? { floatingTopics: Object.freeze(floatingTopics) } : {}),
    ...((value.version as number) >= 4 ? { annotations: readMindMapAnnotations(value.annotations, topics) } : {}) });
}

/**
 * Parses bounded canonical JSON, preserving text without normalization.
 * @param source - Serialized QuireKit document.
 * @returns Immutable validated document.
 */
export function parseMindMap(source: string): MindMapDocument {
  if (source.length > 4000000) throw new RangeError("document: JSON budget exceeded");
  return readMindMapDocument(JSON.parse(source));
}

/**
 * Serializes the canonical document with stable field order.
 * @param document - Document to validate and encode.
 * @returns Lossless JSON source.
 */
export function serializeMindMap(document: MindMapDocument): string {
  const source = JSON.stringify(readMindMapDocument(document));
  if (source.length > 4000000) throw new RangeError("document: JSON budget exceeded");
  return source;
}
