import { Extension, type CommandProps } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { blockOperationMeta, insertBlockAt, moveBlockRange, selectBlockRange } from "./commands";
import { createBlockId, createBlockIdentityPlugin, normalizeBlockIdentities } from "./identity";
import type { BlockInteractionOptions } from "./types";

/** Renderer-neutral structural block identities, selections and commands. */
export const BlockInteraction = Extension.create<BlockInteractionOptions>({
  name: "blockInteraction",
  /** @returns Explicit default generic owners. */
  addOptions() {
    return { types: ["paragraph", "heading", "codeBlock", "blockquote", "bulletList", "orderedList", "horizontalRule", "table"], scopes: ["doc"], createId: createBlockId, admit: () => null, requirePortableIdentity: false };
  },
  /** @returns Schema attributes owned by this feature. */
  addGlobalAttributes() {
    return [{ types: [...new Set([...this.options.types, ...this.options.scopes])].filter(name => name !== "doc"), attributes: { blockId: { default: null, rendered: false, keepOnSplit: false } } }];
  },
  /** @returns Canonical typed command factories. */
  addCommands() {
    return { selectBlockRange, moveBlockRange: request => moveBlockRange(request, this.options), insertBlockAt: request => insertBlockAt(request, this.options) };
  },
  /** @returns Instance-scoped identity and clipboard normalization. */
  addProseMirrorPlugins() { return this.editor ? [createBlockIdentityPlugin(this.editor, this.options)] : []; },
  /** Allocates missing initial identities only in an editable document. */
  onCreate() {
    if (!this.editor?.isEditable) return;
    this.editor.commands.command(({ tr }: CommandProps) => {
      if (!normalizeBlockIdentities(tr, this.options)) {
        tr.setMeta("preventDispatch", true);
        return false;
      }
      tr.setMeta("addToHistory", false);
      return true;
    });
  },
  /** @param props - Candidate and continuation. */
  dispatchTransaction({ transaction, next }) {
    const before = this.editor.state.doc;
    next(transaction);
    if (transaction.getMeta(blockOperationMeta) === true && before !== this.editor.state.doc) {
      // The after-boundary runs only after accepted owner append transactions,
      // so following text input cannot merge into the move's history event.
      next(closeHistory(this.editor.state.pm.tr).setMeta("addToHistory", false));
    }
  }
});
