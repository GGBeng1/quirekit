import { Node, type QuireJSONContent } from "@quirekit/core";
import type {} from "@quirekit/accessibility/contract";

/** Consumer example: schema and accessibility facts share ownership in the feature. */
export const CustomTitle = Node.create({
  name: "customTitle",
  group: "block",
  content: "inline*",
  /** @returns Pure facts; the optional engine owns HTML, focus, and native input. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Heading semantics without relying on a built-in node name. */
      describe: () => ({ kind: "heading", level: 3, editable: true }) }];
  }
});

/** @param text - Source text. @returns Canonical ordinary paragraph. */
function paragraph(text: string): QuireJSONContent { return { type: "paragraph", content: [{ type: "text", text }] }; }

/** Nested content deliberately crosses the four-leaf reading segment boundary. */
export const structuredContent: QuireJSONContent = { type: "doc", content: [
  { type: "customTitle", content: [{ type: "text", text: "Contributed title" }] },
  { type: "blockquote", content: [{ type: "paragraph", content: [
    { type: "text", text: "Quoted link", marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://example.com" } }] }
  ] }] },
  { type: "orderedList", attrs: { start: 7 }, content: [
    { type: "listItem", content: [paragraph("First item"), { type: "bulletList", content: [
      { type: "listItem", content: [paragraph("Nested item")] }
    ] }] },
    { type: "listItem", content: [paragraph("Second item")] }
  ] }
] };
