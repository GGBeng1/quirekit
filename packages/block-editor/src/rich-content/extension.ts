import { richContentMenu } from "./menu";
import { Extension, type RawCommands } from "@quirekit/core";
import { closeHistory, Fragment } from "@quirekit/pm";
import type { QuireJSONContent } from "@quirekit/core";
import type { BlockRichContentOptions, RichContentRequest } from "./types";
declare module "@quirekit/core" {
  /** Captured-target rich content mutations. */
  interface Commands<ReturnType> {
    /** One atomic write after an authoring dialog or resource preparation. */
    readonly blockRichContent: {
      /** @param request - Original source. @param content - Valid canonical blocks. @returns Whether the exact target accepted the write. */
      readonly applyBlockRichContent: (request: RichContentRequest, content: readonly QuireJSONContent[]) => ReturnType;
    };
  }
}
/** Optional host services and a single guarded insertion contract. */
export const BlockRichContent = Extension.create<BlockRichContentOptions>({
  name: "blockRichContent",
  /** @returns Small portable files by default; a host can supply its storage adapter. */
  addOptions() { return { maxFileSize: 4 * 1024 * 1024 }; },
  /** @returns One provider shared by all rich-content atoms. */
  addBlockMenuProviders() { return [richContentMenu]; },
  /** @returns Typed command preserving validation and canonical history. */
  addCommands(): Partial<RawCommands> { return {
    applyBlockRichContent: (request, content) => ({ editor, tr, commands }) => {
      if (!editor.isEditable || editor.isDestroyed || tr.doc !== request.doc || !content.length) return false;
      try {
        let nodes = content.map(item => editor.state.schema.nodeFromJSON(item));
        nodes.forEach(node => node.check());
        const inline = request.kind === "attachment" && nodes.every(node => node.type.name === "inlineAttachment");
        if (!inline && nodes.some(node => !node.isBlock)) return false;
        const { from, to } = request.range;
        if (from < 0 || to < from || to > tr.doc.content.size) return false;
        // Explicit block replacement must fit its original parent. Never drop unsupported content.
        const $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
        // A slash or adjacent-block target needs a paragraph wrapper; caret insertion stays inline.
        if (inline && !$from.parent.isTextblock) {
          const paragraph = editor.state.schema.nodes.paragraph;
          if (!paragraph) return false;
          nodes = [paragraph.create(null, Fragment.fromArray(nodes))];
        }
        if ($from.parent === $to.parent && !$from.parent.isTextblock
          && !$from.parent.canReplace($from.index(), $to.index(), Fragment.fromArray(nodes))) return false;
        closeHistory(tr);
        return commands.insertContentAt({ from, to }, nodes.map(node => node.toJSON()));
      } catch { return false; }
    }
  }; }
});
