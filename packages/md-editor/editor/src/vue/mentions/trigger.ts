import { EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { Extension, sourceInputHasFocus, readSourcePresentation, type AnyExtension } from "@quirekit/msfe-core";
import type { MdMentionTrigger } from "./types";

/** @param open - Product-owned mapped contact picker. @returns A constant-work trigger listener; paste, composition, code and email text stay ordinary source. */
export function createMdMentionTrigger(open: (request: MdMentionTrigger) => void): AnyExtension {
  return createMdInputTrigger("md-mention-trigger", "@", /[\s([{“‘]/u, open);
}

/**
 * Opens the document link picker when `[[` is typed; brackets the editor closed automatically are replaced with the link.
 * @param open - Product-owned document picker.
 * @returns A constant-work trigger listener with the same input rules as mentions.
 */
export function createMdDocumentLinkTrigger(open: (request: MdMentionTrigger) => void): AnyExtension {
  return createMdInputTrigger("md-document-link-trigger", "[[", null, open);
}

/**
 * @param name - Extension name.
 * @param sequence - Typed characters that open the picker.
 * @param before - Characters allowed before the sequence, or null for any.
 * @param open - Picker opener.
 * @returns Trigger listener for typed input only, outside code, links and other raw syntax.
 */
function createMdInputTrigger(name: string, sequence: string, before: RegExp | null, open: (request: MdMentionTrigger) => void): AnyExtension {
  return Extension.create({
    name,
    /** @returns Native input observations; the public editor exists only after creation. */
    addCodeMirrorExtensions() {
      return EditorView.updateListener.of(update => {
        if (!update.docChanged || update.view.composing || readSourcePresentation(update.state).composing || !sourceInputHasFocus(update.view) || update.state.readOnly
          || update.state.selection.ranges.length !== 1 || !update.state.selection.main.empty
          || !update.transactions.some(transaction => transaction.isUserEvent("input.type"))) return;
        const pos = update.state.selection.main.head;
        const start = pos - sequence.length;
        if (start < 0 || update.state.sliceDoc(start, pos) !== sequence || before && start > 0 && !before.test(update.state.sliceDoc(start - 1, start))) return;
        // Query only the caret's ancestor chain, never the document or selected text.
        for (let node = syntaxTree(update.state).resolveInner(start, 1); node; node = node.parent!) {
          if (/^(FencedCode|CodeBlock|InlineCode|InlineMath|DisplayMath|Frontmatter|Link|Image|Autolink|URL|HTMLBlock|HTMLTag)$/u.test(node.name)) return;
        }
        // Brackets closed automatically after `[[` belong to the trigger and are replaced together.
        const end = sequence === "[[" && update.state.sliceDoc(pos, pos + 2) === "]]" ? pos + 2 : pos;
        // Extension compilation runs before the editor exists; resolve it only for accepted input.
        const editor = this.editor, state = update.state, scope = editor.documentScope;
        /** @returns Whether the original input still owns the live caret and its coordinates. */
        const current = (): boolean => !scope.disposed && editor.state === state && !state.readOnly
          && sourceInputHasFocus(update.view) && !update.view.compositionStarted && !readSourcePresentation(state).composing;
        update.view.requestMeasure({
          // Cancelling in write is too late: deletion can put the captured offset outside the document.
          read: view => current() ? view.coordsAtPos(pos) : null,
          write: rect => {
            if (rect && current())
              open({ editor, range: { from: start, to: end }, x: rect.left, y: rect.bottom });
          },
        });
      });
    },
  });
}

