import {
  Fragment,
  type Node as PMNode,
  type ResolvedPos
} from "@quirekit/pm";
import { createNodeFromContent } from "../helpers/createNodeFromContent";
import { defaultBlockAt } from "../helpers/defaultBlockAt";
import { selectionToInsertionEnd } from "../helpers/selectionToInsertionEnd";
import type { Command, QuireContent } from "../types";

/** Options accepted by `editor.commands.insertDefaultBlock()`. */
export interface InsertDefaultBlockOptions {
  /** Position to insert at, defaulting to the current selection head. */
  readonly pos?: number | ResolvedPos | undefined;
  /** Schema-valid attributes applied to the inserted default block. */
  readonly attrs?: Record<string, any> | undefined;
  /** Optional content inserted inside the new block. */
  readonly content?: QuireContent | PMNode | Fragment | undefined;
  /** Whether selection should move to the inserted block end. */
  readonly updateSelection?: boolean | undefined;
}

/**
 * Inserts the schema's default content block at a requested position.
 *
 * @param options - Position, attributes, content, and selection behavior.
 * @returns Command that inserts the default block when the schema permits it.
 */
export function insertDefaultBlock(
  options: InsertDefaultBlockOptions = {}
): Command {
  return ({ tr, dispatch, editor }) => {
    const $pos = typeof options.pos === "number"
      ? tr.doc.resolve(options.pos)
      : options.pos ?? tr.selection.$from;
    const type = defaultBlockAt($pos.parent.contentMatchAt($pos.index()));

    if (!type) {
      return false;
    }

    const allowedAttributes = new Set(Object.keys(type.spec.attrs ?? {}));
    const attrs = Object.fromEntries(
      Object.entries(options.attrs ?? {}).filter(([name]) =>
        allowedAttributes.has(name)
      )
    );
    const content = options.content === undefined
      ? undefined
      : createNodeFromContent(options.content, editor.schema);
    const node = type.createAndFill(attrs, content);

    if (!node) {
      return false;
    }

    if (dispatch) {
      const stepIndex = tr.steps.length;
      tr.insert($pos.pos, node);
      if (options.updateSelection ?? true) {
        selectionToInsertionEnd(tr, stepIndex, -1);
      }
    }

    return true;
  };
}
