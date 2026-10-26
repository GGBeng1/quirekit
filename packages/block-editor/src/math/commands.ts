import type { RawCommands } from "@quirekit/core";
import { parseMathLatex } from "@quirekit/math";
import { closeHistory } from "@quirekit/pm";
import type { BlockMathChange, BlockMathInsert } from "./types";

declare module "@quirekit/core" {
  /** Public continuous-flow formula mutations. */
  interface Commands<ReturnType> {
    /** Source-preserving math commands; authoring UI is optional. */
    readonly blockMath: {
      /** @param options - Exact source and optional retained destination. @returns Whether insertion is accepted. */
      readonly insertBlockMath: (options: BlockMathInsert) => ReturnType;
      /** @param change - Original source and complete replacement. @returns Whether the source is still current. */
      readonly updateBlockMath: (change: BlockMathChange) => ReturnType;
    };
  }
}

/** @param latex - Untrusted command source. @returns Complete nonempty source admission. */
function valid(latex: string): boolean { return typeof latex === "string" && !!latex.trim() && parseMathLatex(latex).ok; }

/** @returns Typed commands without independent history, document or selection state. */
export function blockMathCommands(): Partial<RawCommands> {
  return {
    insertBlockMath: options => ({ editor, tr, commands }) => {
      if (!editor.isEditable || !valid(options.latex) || options.expectedDocument && tr.doc !== options.expectedDocument) return false;
      const content = { type: options.display ? "displayMath" : "inlineMath", attrs: { latex: options.latex } };
      if (!tr.doc.type.schema.nodes[content.type]) return false;
      closeHistory(tr);
      if (options.destination) return commands.insertBlockAt({ destination: options.destination, replaceEmpty: true,
        content: options.display ? content : { type: "paragraph", content: [content] } });
      return commands.insertContentAt(options.position ?? { from: tr.selection.from, to: tr.selection.to }, content);
    },
    updateBlockMath: change => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !valid(change.latex) || change.expectedDocument && tr.doc !== change.expectedDocument
        || !Number.isInteger(change.position) || change.position < 0 || change.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(change.position);
      if (node !== change.expected || !node || !["inlineMath", "displayMath"].includes(node.type.name)) return false;
      if (dispatch && node.attrs.latex !== change.latex) closeHistory(tr).setNodeMarkup(change.position, undefined, { ...node.attrs, latex: change.latex });
      return true;
    }
  };
}
