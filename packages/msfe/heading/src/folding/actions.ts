import { EditorSelection } from "@quirekit/cm-state";
import { foldedRanges, foldEffect, unfoldEffect } from "@quirekit/cm-language";
import { readSourcePresentation, requestMarkdownParse, type MsfeEditor } from "@quirekit/msfe-core";
import { headingSection } from "./query";
import { headingFoldSnapshot } from "./state";
import type { HeadingFoldSnapshot } from "./types";

/** @param editor - Current owner. @param expected - Snapshot that produced the control. @param position - Confirmed heading start. */
export function toggleHeading(editor: MsfeEditor, expected: HeadingFoldSnapshot, position: number): void {
  if (editor.scope.disposed || editor.documentScope.disposed || headingFoldSnapshot.read(editor.state) !== expected) return;
  const state = editor.state, presentation = readSourcePresentation(state);
  if (presentation.composing || presentation.selecting) return;
  const range = headingSection(state, position);
  if (!range) { requestMarkdownParse(state); return; }
  let closed = false;
  foldedRanges(state).between(range.from, range.from, (from, to) => { if (from === range.from && to === range.to) closed = true; });
  const move = !closed && state.selection.ranges.some(item => [item.anchor, item.head].some(at => at > range.from && at < range.to));
  editor.updateViewState({ effects: [(closed ? unfoldEffect : foldEffect).of(range)],
    ...(move ? { selection: EditorSelection.single(range.from) } : {}) });
}
