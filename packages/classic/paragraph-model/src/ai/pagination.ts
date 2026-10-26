import type { QuireAiCapability } from "@quirekit/ai-contract";
import { resolveWordParagraphFormatting } from "../model";
import type { WordParagraphPagination } from "../types";

/** Model-facing name, property, meaning and people-facing label of each page-boundary switch. */
const switches: readonly { readonly name: string; readonly field: keyof WordParagraphPagination; readonly description: string; readonly label: string }[] = [
  { name: "keepWithNext", field: "keepNext", description: "Keeps the paragraph on the same page as the next one (true), as for headings and captions.", label: "与下段同页" },
  { name: "keepLinesTogether", field: "keepLines", description: "Keeps all lines of the paragraph on one page (true).", label: "段中不分页" },
  { name: "pageBreakBefore", field: "pageBreakBefore", description: "Starts the paragraph on a new page (true), as a paragraph property rather than a break character.", label: "段前分页" },
  { name: "widowControl", field: "widowControl", description: "Avoids a single first or last line of the paragraph alone on a page; on by default, false turns it off.", label: "孤行控制" }
];

/**
 * Page-boundary switches of Word paragraphs, read and written as the paragraph's own values.
 *
 * Values inherited from the paragraph style are not shown: heading styles keep with the
 * next paragraph, and showing that on every heading would only add noise.
 */
export const wordParagraphPaginationAiCapabilities: readonly QuireAiCapability[] = switches.map(({ name, field, description, label }) => ({
  kind: "format",
  name,
  level: "paragraph",
  description,
  schema: { type: "boolean" },
  present: { label, value: value => value === true ? "开" : "关" },
  read: target => target.level === "paragraph" && target.node.attrs.wordParagraph !== undefined
    ? resolveWordParagraphFormatting(target.node.attrs.wordParagraph).pagination[field] ?? undefined
    : undefined,
  apply: ({ tr, from, commands }, value) => {
    const pagination = resolveWordParagraphFormatting(tr.doc.resolve(from).parent.attrs.wordParagraph).pagination;
    return commands.setWordParagraphProperties({ properties: { pagination: { ...pagination, [field]: typeof value === "boolean" ? value : null } } });
  }
}));
