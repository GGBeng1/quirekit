import type { QuireEditor, QuireEditorProps } from "@quirekit/core";
import { Plugin, Slice } from "@quirekit/pm";
import { WordTableSelection } from "../selection/selection";
import { parseWordTableTsv } from "./tsv";
import { readTsvFields } from "./delimited-text";
import { prepareTableCaretPaste, resolveTablePasteCaret } from "./paste/caret";

/** @param editor - Owning editor. @returns Table-only parser using the shared paste pipeline. */
export function createWordTableClipboardPlugin(editor: QuireEditor): Plugin {
  const props: QuireEditorProps = {
    /** @param text - Transformed plain text. @returns Table slice only for structural targets. */
    clipboardTextParser(text: string): Slice | null {
      const selection = editor.state.pm.selection;
      return selection instanceof WordTableSelection
        || (resolveTablePasteCaret(selection) !== null && readTsvFields(text)[0]!.length > 1)
        ? parseWordTableTsv({ schema: editor.schema, tsv: text }) : null;
    },
    /** @param slice - Parsed HTML/private slice. @returns Closed complete table for structural replacement. */
    transformPasted(slice: Slice): Slice {
      return (editor.state.pm.selection instanceof WordTableSelection || resolveTablePasteCaret(editor.state.pm.selection) !== null)
        && slice.content.childCount === 1 && slice.content.firstChild?.type.name === "wordTable"
        ? new Slice(slice.content, 0, 0) : slice;
    },
    quireClipboardPaste: prepareTableCaretPaste
  };
  return new Plugin({ props });
}
