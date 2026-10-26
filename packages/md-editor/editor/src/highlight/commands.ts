import { EditorSelection } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import type { MsfeCommand } from "@quirekit/msfe-core";
import { formatHighlightAttributes, highlightContainerName, parseHighlightAttributes, validHighlightEmoji } from "./attributes";
import type { MdHighlightAttributes } from "./types";

/**
 * @param from - Opening fence start of the captured container.
 * @param change - Fields to replace; `text: undefined` restores the default text color.
 * @param caret - Place the caret at the end of the body, replacing a whole-block selection left by the block menu.
 * @returns One source change limited to the opening line's attribute block, rejected when the container moved or changed kind.
 */
export function updateMdHighlight(from: number, change: Partial<MdHighlightAttributes>, caret = false): MsfeCommand {
  return state => {
    if (from < 0 || from > state.doc.length) return null;
    const node = syntaxTree(state).resolveInner(from, 1);
    let container = node;
    while (container.name !== "CustomContainer" || container.from !== from) {
      if (!container.parent) return null;
      container = container.parent;
    }
    const name = container.getChild("ContainerName"), title = container.getChild("ContainerTitle");
    if (!name || container.getChildren("ContainerMark").length !== 2 || state.sliceDoc(name.from, name.to) !== highlightContainerName) return null;
    if (change.emoji !== undefined && !validHighlightEmoji(change.emoji)) return null;
    const current = parseHighlightAttributes(title ? state.sliceDoc(title.from, title.to) : "");
    const next = { ...current, ...change };
    const insert = formatHighlightAttributes(next);
    // A plain-text title is replaced; the fence length and body stay untouched.
    const range = title ? { from: title.from, to: title.to } : { from: name.to, to: name.to };
    const value = title ? insert : ` ${insert}`;
    if (title && state.sliceDoc(title.from, title.to) === insert) return null;
    if (!caret) return { changes: { ...range, insert: value } };
    const header = state.doc.lineAt(from), close = state.doc.lineAt(container.getChildren("ContainerMark")[1]!.from);
    const end = Math.max(header.to, close.from - 1) + value.length - (range.to - range.from);
    return { changes: { ...range, insert: value }, selection: EditorSelection.cursor(end) };
  };
}
