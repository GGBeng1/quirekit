import type {
  Fragment,
  Node as PMNode,
  ParseOptions
} from "@quirekit/pm";
import type { Command, QuireContent } from "../types";
import { insertContentAt } from "./insertContentAt";

/** Options accepted by `editor.commands.insertContent()`. */
export interface InsertContentOptions {
  /** DOM parser options used for HTML content. */
  readonly parseOptions?: ParseOptions | undefined;
  /** Whether selection should move to the inserted content end. */
  readonly updateSelection?: boolean | undefined;
  /** Whether input rules should run for inserted content. */
  readonly applyInputRules?: boolean | undefined;
  /** Whether paste rules should run for inserted content. */
  readonly applyPasteRules?: boolean | undefined;
}

/**
 * Inserts content at the current selection.
 *
 * @param context - Current command execution context.
 * @param content - Content to insert.
 * @param options - Optional insertion options.
 * @returns Whether insertion succeeded.
 */
export function insertContent(
  content: QuireContent | PMNode | Fragment,
  options?: InsertContentOptions
): Command {
  return (context) => insertContentAt(
    {
      from: context.tr.selection.from,
      to: context.tr.selection.to
    },
    content,
    options
  )(context);
}
