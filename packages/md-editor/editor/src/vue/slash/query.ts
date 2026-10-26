import type { EditorState } from "@quirekit/cm-state";
import { sourceBlockAt, readSourcePresentation } from "@quirekit/msfe-core";
import type { MdSlashQuery } from "./types";

/** @param state - Native accepted source and selection. @returns A bounded standalone query, without parsing or walking siblings. */
export function mdSlashQuery(state: EditorState): MdSlashQuery | null {
  const { main, ranges } = state.selection;
  if (state.readOnly || readSourcePresentation(state).mode !== "live" || ranges.length !== 1 || !main.empty) return null;
  const line = state.doc.lineAt(main.head);
  // Reject long prose before materializing a line string. The trigger belongs to
  // one paragraph, not an inline slash inside arbitrary text or a code owner.
  if (line.length > 68 || main.head !== line.to) return null;
  const match = /^ {0,3}\/([\p{L}\p{N}_-]{0,64})$/u.exec(line.text);
  if (!match) return null;
  const block = sourceBlockAt(state, line.from);
  return block?.name === "Paragraph" && block.from === line.from && block.to === line.to ? { block, query: match[1]! } : null;
}
