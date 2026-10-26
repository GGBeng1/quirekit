import { getTextSerializersFromSchema, type QuireTextSerializer } from "@quirekit/core";
import type { Node as ProseMirrorNode, Schema } from "@quirekit/pm";
import type { ClassicWordCountSummary } from "./types";

/** Unicode whitespace as matched by `\s` and trimmed by `String.prototype.trim`. */
const whitespace = /\s/u;
/** Text that is neither joined to nor separating its neighbors. */
const emptySummary: ClassicWordCountSummary = Object.freeze({
  characters: 0, runs: 0, empty: true, leadingWord: false, trailingWord: false
});
/** Whitespace separator plain-text serialization inserts before every block. */
const blockSeparator: ClassicWordCountSummary = Object.freeze({
  characters: 0, runs: 0, empty: false, leadingWord: false, trailingWord: false
});

/** Summaries of non-text nodes; nodes are immutable and shared between documents. */
const summaries = new WeakMap<ProseMirrorNode, ClassicWordCountSummary>();
/** Plain-text serializers declared by each schema's node specs. */
const serializersBySchema = new WeakMap<Schema, Record<string, QuireTextSerializer>>();
/** Nodes summarized since load, read by work-count regressions. */
let summarizedNodes = 0;

/**
 * Summarizes a document's plain text exactly as `editor.getText()` would count it.
 *
 * Each non-text node keeps the summary of its own subtree, so after an edit only the nodes on the
 * changed path are summarized again. This relies on text serializers depending only on the node
 * they serialize, as every built-in one does; their position, parent and index are passed but
 * an unchanged node keeps its first result.
 *
 * @param doc - Current document.
 * @returns Counting facts of the whole document text.
 */
export function summarizeClassicDocumentWords(doc: ProseMirrorNode): ClassicWordCountSummary {
  let serializers = serializersBySchema.get(doc.type.schema);
  if (serializers === undefined) {
    serializers = getTextSerializersFromSchema(doc.type.schema);
    serializersBySchema.set(doc.type.schema, serializers);
  }
  return summarizeChildren(doc, -1, serializers, { from: 0, to: doc.content.size });
}

/** @returns Nodes summarized since load. */
export function readClassicWordCountSummarizedNodes(): number {
  return summarizedNodes;
}

/**
 * Combines a node's children in serialization order, reusing the node's retained summary.
 *
 * @param node - Document or non-text node whose content is serialized.
 * @param pos - Position of the node, -1 for the document itself.
 * @param serializers - Schema plain-text serializers.
 * @param range - Serialized document range passed to serializers.
 * @returns Summary of the node's serialized content.
 */
function summarizeChildren(
  node: ProseMirrorNode,
  pos: number,
  serializers: Record<string, QuireTextSerializer>,
  range: { readonly from: number; readonly to: number }
): ClassicWordCountSummary {
  const retained = summaries.get(node);
  if (retained !== undefined) return retained;
  summarizedNodes += 1;
  const summary = { characters: 0, runs: 0, empty: true, leadingWord: false, trailingWord: false };
  node.forEach((child, offset, index) => {
    const childPos = pos + 1 + offset;
    if (child.isBlock) append(summary, blockSeparator);
    const serializer = serializers[child.type.name];
    append(summary, serializer !== undefined
      ? summarizeText(serializer({ node: child, pos: childPos, parent: node, index, range }))
      : child.isText
        ? summarizeText(child.text ?? "")
        : child.isLeaf ? emptySummary : summarizeChildren(child, childPos, serializers, range));
  });
  const frozen = Object.freeze(summary);
  summaries.set(node, frozen);
  return frozen;
}

/**
 * Summarizes one plain-text string.
 *
 * @param text - Serialized text.
 * @returns Its counting facts.
 */
function summarizeText(text: string): ClassicWordCountSummary {
  if (text.length === 0) return emptySummary;
  let characters = 0;
  let runs = 0;
  let inWord = false;
  let leadingWord: boolean | undefined;
  for (const character of text) {
    const isWord = !whitespace.test(character);
    leadingWord ??= isWord;
    if (isWord) {
      characters += 1;
      if (!inWord) runs += 1;
    }
    inWord = isWord;
  }
  return { characters, runs, empty: false, leadingWord: leadingWord ?? false, trailingWord: inWord };
}

/**
 * Appends following text to an accumulated summary; a word split across them counts once.
 *
 * @param target - Accumulated summary of the earlier text, updated in place.
 * @param right - Following text.
 */
function append(
  target: { -readonly [Key in keyof ClassicWordCountSummary]: ClassicWordCountSummary[Key] },
  right: ClassicWordCountSummary
): void {
  if (right.empty) return;
  if (target.empty) {
    Object.assign(target, right);
    return;
  }
  target.runs += right.runs - (target.trailingWord && right.leadingWord ? 1 : 0);
  target.characters += right.characters;
  target.trailingWord = right.trailingWord;
}
