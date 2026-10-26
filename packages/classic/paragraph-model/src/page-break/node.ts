import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/classic-revision-contract";
import { Node } from "@quirekit/core";

/** Independent Word run-level page boundary; paragraph policy remains separate. */
export const WordPageBreak = Node.create({
  name: "wordPageBreak",
  priority: 1100,
  inline: true,
  group: "inline",
  selectable: false,
  atom: true,
  /** @param extension - Schema owner. @returns Neutral inline flow contract. */
  extendNodeSchema(extension) {
    return extension.name === "wordPageBreak" ? { quireInlineBreak: "page" } : null;
  },
  /** @returns Explicit HTML identity, distinct from ordinary line breaks. */
  parseHTML() { return [{ tag: 'br[data-quirekit-page-break]' }]; },
  /** @returns Portable HTML representation of an authored page break. */
  renderHTML() { return ["br", { "data-quirekit-page-break": "", style: "break-after:page" }]; },
  /** @returns Plain-text form-feed representation. */
  renderText() { return "\f"; },
  /** @returns Explicit HTML in Markdown where CommonMark has no page-break token. */
  renderMarkdown() { return '<br data-quirekit-page-break style="break-after:page">'; },
  /** @returns How the AI document view shows the break. */
  addAiCapabilities() {
    return [{ kind: "block" as const, node: this.name, label: () => "分页符" }];
  },
  /** @returns Revision policy for a run-level atomic leaf. */
  addWordRevisions() {
    return [{ id: "word-page-break.revision", nodePolicies: [{
      nodeType: this.name, insertion: "mark", deletion: "mark", docx: "native"
    }] }];
  },
  /** @returns Page shortcut ahead of the generic hard-break fallback. */
  addKeyboardShortcuts() {
    return { "Mod-Enter": () => {
      if (!this.editor) return false;
      this.editor.commands.insertWordPageBreak();
      // Word owns this key even when the current story rejects page creation.
      // Falling through would silently insert an ordinary hard break instead.
      return true;
    } };
  }
});
