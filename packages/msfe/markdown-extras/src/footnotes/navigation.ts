import { EditorSelection } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation, type MsfeEditor, type SourceAnchor } from "@quirekit/msfe-core";
import { normalizeFootnoteLabel, queryFootnotes } from "./query";

const origins = new WeakMap<MsfeEditor, { label: string; anchor: SourceAnchor }>();

/**
 * Navigates without a source transaction or a write permission requirement.
 * @param editor - Canonical editor, including read-only instances.
 * @param direction - Definition, or originating/next reference.
 * @param position - Current source point, normally the caret or an activated marker.
 * @returns Whether a current resolved destination was focused and scrolled into view.
 */
export function navigateFootnote(editor: MsfeEditor, direction: "definition" | "reference", position = editor.state.selection.main.head): boolean {
  const state = editor.state;
  if (readSourcePresentation(state).composing) return false;
  let node = syntaxTree(state).resolveInner(position, 1);
  while (!/^Footnote(?:Reference|Definition)$/u.test(node.name) && node.parent) node = node.parent;
  const token = node.getChild("FootnoteLabel");
  if (!token) return false;
  const label = normalizeFootnoteLabel(state.sliceDoc(token.from, token.to)), index = queryFootnotes(state);
  const entry = index.entries.get(label);
  if (index.status !== "ready" || !entry?.definition || !entry.references.length) return false;
  let destination: number;
  if (direction === "definition") {
    if (node.name !== "FootnoteReference") return false;
    origins.get(editor)?.anchor.release();
    origins.set(editor, { label, anchor: editor.captureAnchor({ from: node.from, to: node.to }) });
    destination = entry.definition.from;
  } else {
    const current = entry.references.findIndex(reference => reference.from === node.from);
    const origin = origins.get(editor), target = origin?.label === label ? origin.anchor.target() : undefined;
    destination = current >= 0 ? entry.references[(current + 1) % entry.references.length]!.from
      : entry.references.find(reference => reference.from === target?.selection.main.from)?.from ?? entry.references[0]!.from;
  }
  editor.setSelection(EditorSelection.single(destination)); editor.scrollTo(destination); editor.focus(); return true;
}
