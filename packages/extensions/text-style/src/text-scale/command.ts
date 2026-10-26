import type { CommandSpec } from "@quirekit/core";
import { hasTextStyleAttributes } from "../style-attributes";
import { isTextScale, writeTextScale } from "./value";

/**
 * Creates an atomic character-width command.
 * @param unset - Whether to clear the direct value.
 * @returns Atomic command preserving every unrelated run property.
 */
export function createTextScaleCommand(unset = false): CommandSpec {
  return (input) => (context) => {
    const value = unset ? null : input;
    if (!context.editor.isEditable || (value !== null && !isTextScale(value)) || (!unset && value === null)) {
      context.tr.setMeta("preventDispatch", true);
      return false;
    }
    const markType = context.state.schema.marks.textStyle;
    if (markType === undefined) return false;
    const { tr } = context;
    // One root transaction owns both the edited property and retirement of its legacy envelope.
    if (tr.selection.empty) {
      if (!tr.selection.$from.parent.type.allowsMarkType(markType)) { tr.setMeta("preventDispatch", true); return false; }
      const marks = tr.storedMarks ?? context.state.storedMarks ?? tr.selection.$from.marks();
      const attrs = { ...marks.find(mark => mark.type === markType)?.attrs };
      writeTextScale(attrs, value);
      tr.removeStoredMark(markType);
      if (hasTextStyleAttributes(attrs)) tr.addStoredMark(markType.create(attrs));
    } else {
      let applicable = false;
      for (const range of tr.selection.ranges) {
        tr.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, position, parent) => {
          if (!node.isText || !parent?.type.allowsMarkType(markType)) return;
          const from = Math.max(position, range.$from.pos);
          const to = Math.min(position + node.nodeSize, range.$to.pos);
          if (from >= to) return;
          applicable = true;
          const attrs = { ...node.marks.find(mark => mark.type === markType)?.attrs };
          writeTextScale(attrs, value);
          tr.removeMark(from, to, markType);
          if (hasTextStyleAttributes(attrs)) tr.addMark(from, to, markType.create(attrs));
        });
      }
      if (!applicable) { tr.setMeta("preventDispatch", true); return false; }
    }
    if (!context.state.filterTransaction(tr)) { tr.setMeta("preventDispatch", true); return false; }
    context.dispatch?.(tr.scrollIntoView());
    return true;
  };
}
