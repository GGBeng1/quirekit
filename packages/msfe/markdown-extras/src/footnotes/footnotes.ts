import { Node, defineSource } from "@quirekit/msfe-core";
import { footnoteSyntax } from "./syntax";
import type { FootnoteOptions } from "./types";
import { projectFootnote } from "./projection";
import { footnoteEvents } from "./events";
import { navigateFootnote } from "./navigation";
import { projectInlineFootnote } from "./inline-projection";

/** Optional label-preserving footnotes with native editable definition text. */
export const Footnotes = Node.create<FootnoteOptions>({ name: "footnotes",
  /** @returns Localizable semantic labels; styling belongs to the host. */
  addOptions: () => ({ referenceLabel: number => `Footnote ${number}: go to definition`, definitionLabel: number => `Footnote ${number}: return to reference` }),
  /** @returns Source-neutral navigation, also available in read-only documents. */
  addKeyboardShortcuts() { return { "Mod-Enter": () => navigateFootnote(this.editor, "definition"), "Mod-Shift-Enter": () => navigateFootnote(this.editor, "reference") }; },
  /** @returns Semantic marker activation without replacing native selection handling. */
  addCodeMirrorExtensions() { return footnoteEvents(() => this.editor); },
  /** @returns Canonical reference and definition grammar. */
  addMarkdownExtensions: () => footnoteSyntax,
  /** @returns Queryable labels without creating generated document content. */
  addSource: () => defineSource({ nodes: ["FootnoteReference", "FootnoteDefinition"],
    /** @param document - Canonical source. @param node - Reference or definition. @returns Original label identity when confirmed. */
    read(document, node) {
    const label = node.child("FootnoteLabel"); return label ? { label: document.slice(label.from, label.to) } : null;
  }, patch: () => null }),
  /** @returns Superscript reference labels and native definition lines. */
  addProjections() { return [{ nodes: ["FootnoteReference", "FootnoteDefinition"], decorate: input => projectFootnote(input, this.options) },
    { nodes: ["InlineFootnote"], decorate: projectInlineFootnote }]; },
});
