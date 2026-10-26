import { Selection, type Fragment, type Node as PMNode } from "@quirekit/pm";
import { createDocument } from "../helpers/createDocument";
import { setQuireTransactionOrigin } from "../transactions/origin";
import type {
  CommandSpec,
  QuireContent,
  QuireSetContentOptions
} from "../types";

/**
 * Replaces the complete document, including top-node attributes, as one command.
 *
 * This QuireKit command is intended for opening another document. Tiptap's
 * `setContent` command remains unchanged for ordinary content replacement.
 *
 * @param content - Complete document content to install.
 * @param options - Parsing and update-event options.
 * @returns Command that performs a non-history document replacement.
 */
export const replaceDocument: CommandSpec = (
  content,
  options = {}
) => (context) => {
  const commandOptions = options as QuireSetContentOptions;
  const resolvedContent =
    commandOptions.contentType === "markdown" && typeof content === "string"
      ? context.editor.markdown.parse(content)
      : content;
  const document = createDocument(
    resolvedContent as QuireContent | PMNode | Fragment,
    context.state.schema,
    commandOptions.parseOptions,
    commandOptions.errorOnInvalidContent === undefined
      ? {}
      : { errorOnInvalidContent: commandOptions.errorOnInvalidContent }
  );

  if (context.dispatch) {
    setQuireTransactionOrigin(context.tr, "import");
    // Replace body content before projecting every declared top-node attribute.
    context.tr.replaceWith(0, context.tr.doc.content.size, document.content);
    for (const [name, value] of Object.entries(document.attrs)) {
      context.tr.setDocAttribute(name, value);
    }

    // Opening another document establishes a fresh, deterministic interaction baseline.
    context.tr
      .setSelection(Selection.atStart(context.tr.doc))
      .setMeta("addToHistory", false)
      .setMeta("quireViewUpdateReason", "document-replace")
      .setMeta("preventUpdate", commandOptions.emitUpdate === false);
  }

  return true;
};
