import type { SourceDocument, SourceNode, ProjectionReplacement } from "@quirekit/msfe-core";
import { inlineContinuations } from "./continuation";

/**
 * Normalizes only parser-confirmed inline-code text, retaining native source characters between edits.
 * @param document - Canonical Markdown access.
 * @param node - Accepted inline-code syntax with delimiter children.
 * @returns Source-mapped presentation edits; selecting the owner reveals the original spelling.
 */
export function normalizeInlineCode(document: SourceDocument, node: SourceNode): readonly ProjectionReplacement[] {
  const marks = node.children("CodeMark"), first = marks[0], last = marks.at(-1);
  if (!first || !last || first.to >= last.from) return [];
  const from = first.to, body = document.slice(from, last.from);
  let table = false;
  for (let parent = node.parent(); parent; parent = parent.parent()) if (parent.kind === "Table") { table = true; break; }
  const edits: { from: number; to: number; text: string }[] = [];
  const continuationAt = body.includes("\n") ? inlineContinuations(document, node) : null;
  // Logical whitespace differs from persisted bytes. Emit only changed fragments, so
  // ordinary code characters continue to participate in CM's native hit testing.
  for (let index = 0; index < body.length; index++) {
    if (body[index] === "\n") {
      const continuation = continuationAt!(from + index + 1);
      edits.push({ from: from + index, to: continuation.to, text: " ".repeat(1 + continuation.residual) });
      index = continuation.to - from - 1;
    } else if (table && body[index] === "\\" && body[index + 1] === "|") {
      edits.push({ from: from + index, to: from + index + 1, text: "" });
    }
  }
  let logical = "", previous = from;
  for (const edit of edits) { logical += document.slice(previous, edit.from) + edit.text; previous = edit.to; }
  logical += document.slice(previous, last.from);
  if (logical.startsWith(" ") && logical.endsWith(" ") && /[^ ]/u.test(logical)) {
    const head = edits[0], tail = edits.at(-1);
    if (head?.from === from) head.text = head.text.slice(1);
    else edits.unshift({ from, to: from + 1, text: "" });
    if (tail?.to === last.from) tail.text = tail.text.slice(0, -1);
    else edits.push({ from: last.from - 1, to: last.from, text: "" });
  }
  return edits.map(edit => ({ type: "replace", from: edit.from, to: edit.to, key: `${node.from}/${edit.from}`,
    block: false, ...(edit.text ? { text: edit.text } : {}), revealRange: { from: node.from, to: node.to } }));
}
