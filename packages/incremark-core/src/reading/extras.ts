import type { SyntaxNode } from "@lezer/common";
import { normalizeFootnoteLabel, queryFootnotes } from "@quirekit/msfe-markdown-extras";
import type { ReadingContext } from "./types";

/** @param context - Accepted source. @param node - Formula syntax. @returns Shared safe formula output or undefined for incomplete input. */
export function renderMath<Output>(context: ReadingContext<Output>, node: SyntaxNode): Output | undefined {
  const marks = node.getChildren(`${node.name}Mark`);
  if (marks.length !== 2) return undefined;
  const inline = node.name === "InlineMath";
  const text = inline ? context.state.sliceDoc(marks[0]!.to, marks[1]!.from)
    : node.getChildren("DisplayMathText").map(part => context.state.sliceDoc(part.from, part.to)).join("\n");
  return context.adapter.preview(node, { kind: inline ? "inlineMath" : "displayMath", source: context.state.sliceDoc(node.from, node.to), text });
}

/** @param context - Snapshot with shared footnote index. @param node - Reference or definition. @returns Accessible ordinal with document-local navigation, or original unresolved source. */
export function renderFootnoteNumber<Output>(context: ReadingContext<Output>, node: SyntaxNode): Output {
  const label = node.getChild("FootnoteLabel"), index = queryFootnotes(context.state);
  const entry = label ? index.entries.get(normalizeFootnoteLabel(context.state.sliceDoc(label.from, label.to))) : undefined;
  const reference = node.name === "FootnoteReference";
  if (!entry?.number || !entry.definition) return reference ? context.adapter.text(context.state.sliceDoc(node.from, node.to)) : context.adapter.fragment([]);
  if (!reference && entry.definition.from !== node.from) return context.adapter.text(context.state.sliceDoc(node.from, label!.to + 2));
  const target = `${context.prefix}-${reference ? "definition" : "reference"}-${reference ? entry.definition.from : entry.references[0]!.from}`;
  const id = `${context.prefix}-${reference ? "reference" : "definition"}-${node.from}`;
  const labelText = context.locale === "en" ? `Footnote ${entry.number}` : `脚注 ${entry.number}`;
  return context.element(node, reference ? "sup" : "span", {}, context.element(node, "a", { id, href: `#${target}`, "aria-label": labelText }, context.adapter.text(reference ? String(entry.number) : `[${entry.number}] ↩`)));
}
