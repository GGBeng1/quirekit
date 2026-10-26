import { createMindMapNodeReader } from "../model/nodes";
import { readRecord } from "../model/validation";
import type { MindMapNode } from "../model/types";
import type { MindMapClipboard } from "./types";
import { readMindMapAnnotations } from "../annotations/validation";
import { mindMapTopicIds } from "../annotations/references";

/** Native clipboard format shared by every QuireKit mind-map instance. */
export const mindMapClipboardMime = "application/x-quirekit-mind-map+json";

/** @param input - Untrusted fragment. @returns Detached subtrees validated against shared budgets. */
export function readMindMapClipboard(input: unknown): MindMapClipboard {
  const value = readRecord(input, ["version", "topics", "annotations"], "clipboard");
  if (![1, 2, 3, 4].includes(value.version as number) || !Array.isArray(value.topics) || !value.topics.length || value.topics.length > 10000) {
    throw new TypeError("clipboard: invalid version or topics");
  }
  if ((value.version as number) < 3 && Object.hasOwn(value, "annotations")) throw new TypeError("clipboard: annotations require version 3");
  const visit = createMindMapNodeReader((value.version as number) >= 2, (value.version as number) >= 4);
  const topics = Object.freeze(Array.from(value.topics, node => visit(node, 0, true)));
  return Object.freeze({ version: value.version as MindMapClipboard["version"], topics,
    ...((value.version as number) >= 3 ? { annotations: readMindMapAnnotations(value.annotations, mindMapTopicIds(topics)) } : {}) });
}

/** @param source - Untrusted serialized fragment. @returns Strictly validated clipboard. */
export function parseMindMapClipboard(source: string): MindMapClipboard {
  if (source.length > 4000000) throw new RangeError("clipboard: JSON budget exceeded");
  return readMindMapClipboard(JSON.parse(source));
}

/** @param fragment - Selected complete subtrees. @returns Portable bounded JSON. */
export function serializeMindMapClipboard(fragment: MindMapClipboard): string {
  const source = JSON.stringify(readMindMapClipboard(fragment));
  if (source.length > 4000000) throw new RangeError("clipboard: JSON budget exceeded");
  return source;
}

/** @param fragment - Complete subtrees. @returns Literal readable outline for other applications. */
export function textMindMapClipboard(fragment: MindMapClipboard): string {
  const lines: string[] = [];
  let size = 0;
  /** @param node - Current subtree. @param depth - Outline indentation. */
  function visit(node: MindMapNode, depth: number): void {
    for (const line of node.text.split("\n")) {
      size += depth + line.length + 1;
      if (size > 4000000) throw new RangeError("clipboard: outline budget exceeded");
      lines.push("\t".repeat(depth) + line);
    }
    node.children.forEach(child => visit(child, depth + 1));
  }
  readMindMapClipboard(fragment).topics.forEach(node => visit(node, 0));
  return lines.join("\n");
}

/** @param text - Plain text from another application. @returns Flat topics; formatting is never inferred. */
export function plainMindMapClipboard(text: string): MindMapClipboard {
  if (text.length > 1000000) throw new RangeError("clipboard: text budget exceeded");
  return readMindMapClipboard({ version: 1, topics: text.replace(/\r\n?/gu, "\n").split("\n")
    .filter(line => line.trim().length).map((line, index) => ({ id: `line-${index}`, text: line, collapsed: false, children: [] })) });
}
