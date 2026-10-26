import { textDiagramLanguage } from "@quirekit/text-diagram";
import type { SyntaxNode } from "@lezer/common";
import { containerTone } from "./container";
import { markdownMessages } from "./messages";
import { readCodeBody } from "./code";
import { inlineChildren } from "./inline";
import type { ReadingContext } from "./types";
import { renderMath, renderFootnoteNumber } from "./extras";
import { markdownMermaidEnabled, markdownTextDiagramsEnabled } from "../parse/capabilities";

/** @param context - Source snapshot. @param node - Block owner. @param omitted - Non-content markers. @returns Canonical child blocks without source separators. */
export function blockChildren<Output>(context: ReadingContext<Output>, node: SyntaxNode, omitted: readonly string[] = []): Output[] {
  const children: Output[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (!omitted.includes(child.name)) children.push(context.render(child));
  }
  return children;
}

/** @param context - Immutable source and locale. @param node - Confirmed block. @returns Semantic content, or undefined for unknown syntax. */
export function renderBlock<Output>(context: ReadingContext<Output>, node: SyntaxNode): Output | undefined {
  const { state } = context, text = markdownMessages[context.locale];
  if (node.name === "Document") return context.adapter.fragment(blockChildren(context, node));
  if (node.name === "Paragraph" || node.name === "Task") return context.element(node, "p", {}, context.adapter.fragment(inlineChildren(context, node)));
  if (/^(?:ATXHeading[1-6]|SetextHeading[12])$/u.test(node.name)) {
    const marks = node.getChildren("HeaderMark"), first = marks[0];
    const atx = node.name.startsWith("ATX");
    const from = atx && first ? first.to + Number(state.sliceDoc(first.to, first.to + 1) === " ") : node.from;
    const to = atx ? marks.length > 1 ? marks.at(-1)!.from : node.to : first?.from ?? node.to;
    return context.element(node, `h${node.name.slice(-1)}`, {}, context.adapter.fragment(inlineChildren(context, node, from, to)));
  }
  if (node.name === "Blockquote") return context.element(node, "blockquote", {}, context.adapter.fragment(blockChildren(context, node, ["QuoteMark"])));
  if (node.name === "BulletList") return context.element(node, "ul", {}, context.adapter.fragment(blockChildren(context, node)));
  if (node.name === "OrderedList") return context.element(node, "ol", { start: Number(/^\d+/u.exec(state.sliceDoc(node.from, node.to))?.[0] ?? 1) }, context.adapter.fragment(blockChildren(context, node)));
  if (node.name === "ListItem") return context.element(node, "li", node.getChild("Task") ? { style: { listStyle: "none" } } : {}, context.adapter.fragment(blockChildren(context, node, ["ListMark", "QuoteMark"])));
  if (node.name === "HorizontalRule") return context.element(node, "hr");
  if (node.name === "DisplayMath") return renderMath(context, node);
  if (node.name === "DefinitionList") return context.element(node, "dl", {}, context.adapter.fragment(blockChildren(context, node)));
  if (node.name === "DefinitionTerm") return context.element(node, "dt", {}, context.adapter.fragment(inlineChildren(context, node)));
  if (node.name === "DefinitionDescription") return context.element(node, "dd", {}, context.adapter.fragment(blockChildren(context, node, ["DefinitionMark"])));
  if (node.name === "FootnoteDefinition") return context.element(node, "div", { role: "note" }, context.adapter.fragment([renderFootnoteNumber(context, node), ...blockChildren(context, node, ["FootnoteLabel"])]));
  if (node.name === "Frontmatter") return context.adapter.source(node, state.sliceDoc(node.from, node.to), "metadata", context.locale);
  if (node.name === "CustomContainer") {
    const name = node.getChild("ContainerName"), title = node.getChild("ContainerTitle");
    if (!name || node.getChildren("ContainerMark").length !== 2) return undefined;
    const kind = state.sliceDoc(name.from, name.to);
    const children = blockChildren(context, node, ["ContainerMark", "ContainerName", "ContainerTitle"]);
    return context.adapter.container(node, { kind, title: title ? state.sliceDoc(title.from, title.to) : kind,
      tone: containerTone(kind), collapsible: kind === "details", open: kind !== "details" }, context.adapter.fragment(children));
  }
  if (node.name === "FencedCode" || node.name === "CodeBlock") {
    const closed = node.name === "FencedCode" && node.getChildren("CodeMark").length === 2;
    const info = node.getChild("CodeInfo");
    const language = info ? textDiagramLanguage(state.sliceDoc(info.from, info.to)) : null;
    if (closed && language && state.facet(language === "mermaid" ? markdownMermaidEnabled : markdownTextDiagramsEnabled)) return context.adapter.preview(node, {
      kind: language === "mermaid" ? "mermaid" : "textDiagram", language, text: readCodeBody(state, node), source: state.sliceDoc(node.from, node.to) });
    return context.element(node, "pre", { code: readCodeBody(state, node), language: info ? state.sliceDoc(info.from, info.to) : text.plain }, context.element(node, "code", {}, context.adapter.text(readCodeBody(state, node))));
  }
  if (node.name === "Table") {
    const header = node.getChild("TableHeader"), delimiter = node.getChild("TableDelimiter");
    const alignments = delimiter ? state.sliceDoc(delimiter.from, delimiter.to).trim().replace(/^\||\|$/gu, "").split("|") : [];
    /** @param row - Canonical GFM row. @param tag - Header or body cells. @returns Real semantic table cells, respecting the delimiter column count. */
    function rowContent(row: SyntaxNode, tag: "th" | "td"): Output {
      const cells = row.getChildren("TableCell");
      return context.element(row, "tr", {}, context.adapter.fragment(alignments.map((alignment, index) => context.element(cells[index] ?? row, tag, { style: { textAlign: alignment.trim().endsWith(":") ? alignment.trim().startsWith(":") ? "center" : "right" : "left" } },
        context.adapter.fragment(cells[index] ? inlineChildren(context, cells[index]!) : [])))));
    }
    return context.element(node, "table", {}, context.adapter.fragment([header ? context.element(header, "thead", {}, rowContent(header, "th")) : context.adapter.fragment([]),
      context.element(node, "tbody", {}, context.adapter.fragment(node.getChildren("TableRow").map(row => rowContent(row, "td"))))]));
  }
  if (node.name === "LinkReference") return context.adapter.fragment([]);
  return undefined;
}
