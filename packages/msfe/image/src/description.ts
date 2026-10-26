import { decodeMarkdownString, readSourceDestination, type SourceDocument, type SourceNode } from "@quirekit/msfe-core";

/**
 * Reads a confirmed image description as plain inline text for alt and captions.
 * @param document - Canonical source, never changed by presentation.
 * @param node - Inline owner, including recursively nested labels.
 * @param from - Inclusive description start.
 * @param to - Exclusive description end.
 * @returns Text without formatting syntax or link destinations.
 */
export function imageDescription(document: SourceDocument, node: SourceNode, from: number, to: number): string {
  let output = "", position = from;
  for (const child of node.children()) {
    if (child.from < from || child.to > to) continue;
    output += document.slice(position, child.from); position = child.to;
    if (child.kind === "QuoteMark") {
      if (position < to && document.slice(position, position + 1) === " ") position++;
      continue;
    }
    if (child.kind === "HTMLTag" || /Mark$/u.test(child.kind) && child.kind !== "LinkMark") continue;
    if (child.kind === "Escape" || child.kind === "Entity") output += decodeMarkdownString(document.slice(child.from, child.to));
    else if (child.kind === "InlineCode") {
      const marks = child.children("CodeMark"), first = marks[0], last = marks.at(-1);
      let value = first && last ? document.slice(first.to, last.from).replace(/\n/gu, " ") : document.slice(child.from, child.to);
      if (value.startsWith(" ") && value.endsWith(" ") && /[^ ]/u.test(value)) value = value.slice(1, -1);
      output += value;
    } else if (child.kind === "Link" || child.kind === "Image") {
      const destination = readSourceDestination(document, child);
      output += destination ? imageDescription(document, child, destination.labelFrom, destination.labelTo)
        : imageDescription(document, child, child.from, child.to);
    } else if (child.kind === "HardBreak") output += "\n";
    else output += imageDescription(document, child, child.from, child.to);
  }
  return output + document.slice(position, to);
}
