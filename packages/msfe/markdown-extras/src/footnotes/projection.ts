import { Decoration } from "@quirekit/cm-view";
import type { ProjectionContext } from "@quirekit/msfe-core";
import type { FootnoteOptions } from "./types";
import { normalizeFootnoteLabel, queryFootnotes } from "./query";
import { FootnoteNumber } from "./widget";

/** @param input - Viewport-local confirmed syntax. @param options - Localized semantic labels. @returns Number markers plus native editable multi-block definition lines. */
export function projectFootnote({ state, node, active, from, to }: ProjectionContext, options: FootnoteOptions) {
  const label = node.getChild("FootnoteLabel");
  if (!label) return [];
  const index = queryFootnotes(state), entry = index.entries.get(normalizeFootnoteLabel(state.sliceDoc(label.from, label.to)));
  const reference = node.name === "FootnoteReference";
  const resolved = entry?.number !== undefined && (reference || entry.definition?.from === node.from);
  const result = [];
  if (!active && resolved && node.from >= from && node.from < to) {
    const number = entry.number!;
    result.push(Decoration.replace({ widget: new FootnoteNumber(number, reference ? "reference" : "definition",
      reference ? options.referenceLabel(number) : options.definitionLabel(number)) }).range(node.from, reference ? node.to : label.to + 2));
  } else if (reference) result.push(Decoration.mark({ class: "msfe-footnote-source", attributes: {
    "data-footnote-state": index.status === "pending" ? "pending" : resolved ? "resolved" : "missing",
  } }).range(node.from, node.to));
  if (reference) return result;
  let line = state.doc.lineAt(Math.max(from, node.from));
  while (line.from <= to && line.from < node.to) {
    result.push(Decoration.line({ class: "msfe-footnote-definition" }).range(line.from));
    if (line.to >= state.doc.length) break;
    line = state.doc.lineAt(line.to + 1);
  }
  return result;
}
