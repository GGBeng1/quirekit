import { createChainableState, type RawCommands } from "@quirekit/core";
import { closeHistory, TextSelection } from "@quirekit/pm";
import { normalizeLinkDisplayText, normalizeLinkHref } from "../href";
import { getLinkRange } from "../range";

/**
 * Creates the whole-occurrence link update command.
 * @param name - Owning mark name.
 * @returns Raw command factory with side-effect-free can semantics.
 */
export function createUpdateLinkCommand(name: string): RawCommands["updateLink"] {
  return attributes => ({ state, tr, dispatch }) => {
    // Earlier commands (for example heading bookmarks) may already have moved this link.
    const current = createChainableState({ state, transaction: tr });
    const range = getLinkRange(current, name);
    const href = normalizeLinkHref(attributes?.href);
    const text = href === null ? null : normalizeLinkDisplayText(attributes?.text, href);
    if (!range || href === null || text === null) return false;
    const type = state.schema.marks[name]!;
    const content = tr.doc.slice(range.from, range.to).content;
    const replaceText = attributes.text !== undefined
      && text !== content.textBetween(0, content.size, "");
    let textOnly = true;
    content.forEach(node => { if (!node.isText) textOnly = false; });
    if (replaceText && !textOnly) return false;

    // Validate before writing: address-only edits retain every original run/anchor.
    if (dispatch) {
      closeHistory(tr);
      const mark = type.create({ href });
      if (replaceText) {
        const marks = mark.addToSet(type.removeFromSet(content.firstChild?.marks ?? []));
        tr.replaceWith(range.from, range.to, state.schema.text(text, marks));
        tr.setSelection(TextSelection.create(tr.doc, range.from, range.from + text.length));
      } else {
        tr.addMark(range.from, range.to, mark);
      }
    }
    return true;
  };
}
