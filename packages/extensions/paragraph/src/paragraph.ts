import type {} from "@quirekit/accessibility-contract";
import { mergeAttributes, Node } from "@quirekit/core";
import { paragraphDocxCodec } from "./docx";

/** Options for the paragraph node extension. */
export interface ParagraphOptions {
  /** HTML attributes added when the paragraph serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Paragraph block node extension. */
export const Paragraph = Node.create<ParagraphOptions>({
  name: "paragraph",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "paragraph", editable: true }) }];
  },
  priority: 1000,
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "p" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addDocx() {
    return paragraphDocxCodec;
  }
});
