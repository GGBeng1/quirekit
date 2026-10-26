import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/classic-revision-contract";
import { Node } from "@quirekit/core";

/** Word run-level column boundary; a page break when no later column exists. */
export const WordColumnBreak = Node.create({
  name: "wordColumnBreak",
  priority: 1100,
  inline: true,
  group: "inline",
  selectable: false,
  atom: true,
  /** @param extension - Schema owner. @returns Neutral inline flow contract. */
  extendNodeSchema(extension) {
    return extension.name === "wordColumnBreak" ? { quireInlineBreak: "column" } : null;
  },
  /** @returns Explicit HTML identity, distinct from ordinary line and page breaks. */
  parseHTML() { return [{ tag: "br[data-quirekit-column-break]" }]; },
  /** @returns Portable HTML representation of an authored column break. */
  renderHTML() { return ["br", { "data-quirekit-column-break": "", style: "break-after:column" }]; },
  /** @returns Plain-text line representation. */
  renderText() { return "\n"; },
  /** @returns Explicit HTML in Markdown, which has no column-break token. */
  renderMarkdown() { return '<br data-quirekit-column-break style="break-after:column">'; },
  /** @returns How the AI document view shows the break. */
  addAiCapabilities() {
    return [{ kind: "block" as const, node: this.name, label: () => "分栏符" }];
  },
  /** @returns Revision policy for a run-level atomic leaf. */
  addWordRevisions() {
    return [{ id: "word-column-break.revision", nodePolicies: [{
      nodeType: this.name, insertion: "mark", deletion: "mark", docx: "native"
    }] }];
  },
  /** @returns Word's column-break shortcut. */
  addKeyboardShortcuts() {
    return { "Mod-Shift-Enter": () => {
      if (!this.editor) return false;
      this.editor.commands.insertWordColumnBreak();
      return true;
    } };
  }
});
