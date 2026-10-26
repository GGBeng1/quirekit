import type { RawCommands } from "@quirekit/core";
import { readHtmlSandboxDocument } from "@quirekit/html-sandbox";
import type { HtmlSandboxInsertion, HtmlSandboxUpdate } from "./types";
declare module "@quirekit/core" {
  /** Public command namespace installed by the HTML sandbox extension. */
  interface Commands<ReturnType> {
    /** Canonical source-backed sandbox mutations. */ readonly htmlSandbox: {
      /** @param request - Validated source and optional insertion range. @returns Command acceptance. */ insertHtmlSandbox(request: HtmlSandboxInsertion): ReturnType;
      /** @param request - Exact node target and expected old source. @returns Command acceptance. */ updateHtmlSandbox(request: HtmlSandboxUpdate): ReturnType;
    };
  }
}
/** @returns Commands that preserve the editor's transaction, readonly and history authority. */
export function htmlSandboxCommands(): Pick<RawCommands, "insertHtmlSandbox" | "updateHtmlSandbox"> {
  return {
    insertHtmlSandbox: request => ({ editor, tr, commands }) => {
      if (!editor.isEditable) return false;
      try {
        const document = readHtmlSandboxDocument(request.document);
        const from = request.from ?? tr.selection.from, to = request.to ?? tr.selection.to;
        if (from < 0 || to < from || to > tr.doc.content.size) return false;
        return commands.insertContentAt({ from, to }, { type: "htmlSandbox", attrs: { document } });
      } catch { return false; }
    },
    updateHtmlSandbox: request => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || request.position < 0 || request.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(request.position);
      if (node?.type.name !== "htmlSandbox" || node.attrs.document?.html !== request.expectedHtml) return false;
      try {
        const document = readHtmlSandboxDocument(request.document);
        if (dispatch) tr.setNodeMarkup(request.position, undefined, { ...node.attrs, document });
        return true;
      } catch { return false; }
    },
  };
}
