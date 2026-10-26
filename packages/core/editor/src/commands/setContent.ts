import type { Fragment, Node as PMNode } from "@quirekit/pm";
import { createDocument } from "../helpers/createDocument";
import type {
  CommandSpec,
  QuireContent,
  QuireSetContentOptions
} from "../types";

/**
 * Replaces the whole document with new content through the editor parser.
 *
 * @param context - Current command execution context.
 * @param content - New editor content.
 * @param options - Optional setContent options.
 * @returns Whether the content was accepted.
 */
export const setContent: CommandSpec = (content, options = {}) => (context) => {
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
    context.tr
      .replaceWith(0, context.tr.doc.content.size, document.content)
      .setMeta("quireViewUpdateReason", "document-replace")
      .setMeta("preventUpdate", commandOptions.emitUpdate === false);
  }

  return true;
};
