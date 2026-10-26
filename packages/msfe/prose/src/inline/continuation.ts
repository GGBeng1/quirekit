import type { SourceDocument, SourceNode } from "@quirekit/msfe-core";

/** @param text - Source prefix. @param start - Initial visual column. @returns Column after four-column tab expansion. */
function column(text: string, start = 0): number {
  for (const character of text) start += character === "\t" ? 4 - start % 4 : 1;
  return start;
}

/**
 * Removes only ancestry-owned continuation prefixes from a confirmed inline span.
 * @param document - Canonical Markdown access.
 * @param node - Confirmed inline code, including parser-owned quote markers.
 * @returns A bounded per-line reader sharing the compiled ancestry and quote index.
 */
export function inlineContinuations(document: SourceDocument, node: SourceNode) {
  const ancestors: SourceNode[] = [];
  for (let parent = node.parent(); parent; parent = parent.parent()) ancestors.unshift(parent);
  const quotes = new Map<number, SourceNode[]>();
  for (const mark of node.children("QuoteMark")) {
    const start = document.lineAt(mark.from).from, line = quotes.get(start) ?? [];
    line.push(mark); quotes.set(start, line);
  }
  const steps: ({ kind: "quote" } | { kind: "list"; indent: number })[] = [];
  for (const parent of ancestors) {
    if (parent.kind === "Blockquote") steps.push({ kind: "quote" });
    if (parent.kind !== "ListItem") continue;
    const mark = parent.child("ListMark");
    if (!mark) continue;
    const opening = document.lineAt(mark.from), suffix = document.slice(mark.to, opening.to);
    const spaces = /^[ \t]*/u.exec(suffix)![0];
    const markColumn = column(document.slice(opening.from, mark.to));
    const whitespace = column(spaces, markColumn) - markColumn;
    steps.push({ kind: "list", indent: column(document.slice(parent.from, mark.to)) + (whitespace > 0 && whitespace <= 4 ? whitespace : 1) });
  }
  /** @param from - Position immediately after a newline. @returns Prefix boundary and spaces left from a partial tab. */
  return (from: number) => {
    const line = document.lineAt(from), markers = quotes.get(line.from) ?? [];
    let to = from, visual = 0, residual = 0, quote = 0;
    // The accepted ancestor chain owns list indentation; QuoteMark ranges own explicit
    // quote prefixes. Lazy continuation has no marker and must retain its body text.
    for (const step of steps) {
      if (step.kind === "quote") {
        const mark = markers[quote++];
        if (!mark) continue;
        to = mark.to;
        if (document.slice(to, to + 1) === " ") to++;
        visual = column(document.slice(line.from, to)); residual = 0;
      } else {
        let remaining = step.indent;
        const inherited = Math.min(remaining, residual); remaining -= inherited; residual -= inherited;
        while (remaining > 0 && to < line.to) {
          const character = document.slice(to, to + 1);
          if (character !== " " && character !== "\t") break;
          const width = character === "\t" ? 4 - visual % 4 : 1;
          to++; visual += width; remaining -= width;
        }
        if (remaining < 0) residual += -remaining;
      }
    }
    return { to, residual };
  };
}
