import type { CommandProps, RawCommands } from "@quirekit/core";
import { normalizeLinkDisplayText, normalizeLinkHref } from "../href";
import type { LinkAttributes, LinkInsertionAttributes } from "../types";
import { createUpdateLinkCommand } from "./update";

/** @param name - Owning Link mark. @returns Shared manual Link command factories. */
export function createLinkCommands(name: string): Pick<RawCommands,
  "setLink" | "insertLink" | "updateLink" | "toggleLink" | "unsetLink"
> {
  return {
    setLink: (attributes: LinkAttributes) => ({ commands }: CommandProps) => {
      const href = normalizeLinkHref(attributes?.href);
      return href !== null && commands.setMark(name, { href });
    },
    insertLink: (attributes: LinkInsertionAttributes) => ({ dispatch, state, tr }: CommandProps) => {
      const href = normalizeLinkHref(attributes?.href);
      const text = href === null ? null : normalizeLinkDisplayText(attributes?.text, href);
      const type = state.schema.marks[name];
      if (href === null || text === null || !state.selection.empty
        || !state.selection.$from.parent.inlineContent || !type
        || !state.selection.$from.parent.type.allowsMarkType(type)) return false;
      const marks = type.removeFromSet(state.storedMarks ?? state.selection.$from.marks());
      const linkedMarks = type.create({ href }).addToSet(marks);
      if (!type.isInSet(linkedMarks)) return false;
      if (dispatch) {
        tr.replaceSelectionWith(state.schema.text(text, linkedMarks), false);
        tr.setStoredMarks(marks);
      }
      return true;
    },
    updateLink: createUpdateLinkCommand(name),
    toggleLink: (attributes: LinkAttributes) => ({ commands }: CommandProps) => {
      const href = normalizeLinkHref(attributes?.href);
      return href !== null && commands.toggleMark(name, { href }, { extendEmptyMarkRange: true });
    },
    unsetLink: () => ({ commands }: CommandProps) => commands.unsetMark(name, { extendEmptyMarkRange: true })
  };
}
