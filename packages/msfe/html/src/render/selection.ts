import { EditorSelection, type EditorState, type Extension } from "@quirekit/cm-state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@quirekit/cm-view";
import { readSourcePresentation } from "@quirekit/msfe-core";
import { renderingSetting } from "../setting";
import type { HtmlPointer } from "./types";

/** Pointer metadata is mounted and instance-local; it never becomes a second selection state. */
const pointer = ViewPlugin.fromClass(class {
  previous: HtmlPointer | undefined;
  /** @param update - Accepted state; only unchanged source and presentation can continue a click sequence. */
  update(update: ViewUpdate): void {
    const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
    if (update.docChanged || before.mode !== after.mode || after.composing
      || renderingSetting.read(update.startState) !== renderingSetting.read(update.state)) this.previous = undefined;
  }
  /** Releases source identity on teardown or explicit document replacement. */
  destroy(): void { this.previous = undefined; }
});

/** @param state - Canonical source. @param position - Original HTML hit or current drag target. @param count - Native click count. @returns Native word or source line range. */
function clickRange(state: EditorState, position: number, count: number) {
  if (count === 2) return state.wordAt(position) ?? EditorSelection.cursor(position);
  const line = state.doc.lineAt(position);
  return EditorSelection.range(line.from, Math.min(state.doc.length, line.to + 1));
}

/**
 * Continues a native multi-click at the original source hit after HTML delimiters appear.
 * CM still owns pointer capture, drag publication, multi-selection and clipboard transactions.
 */
export const htmlSelection: Extension = [pointer, EditorView.mouseSelectionStyle.of((view, event) => {
  const memory = view.plugin(pointer)!;
  if (event.button !== 0 || readSourcePresentation(view.state).mode !== "live" || renderingSetting.read(view.state) !== "safe") return null;
  if (event.detail === 1) {
    const target = event.target as Element | null;
    const position = target?.closest(".msfe-html-element, .msfe-html-token")
      ? view.posAtCoords({ x: event.clientX, y: event.clientY }) : null;
    memory.previous = position === null ? undefined : { position, x: event.clientX, y: event.clientY, document: view.state.doc };
    return null;
  }
  const previous = memory.previous;
  if (!previous || previous.document !== view.state.doc || Math.abs(event.clientX - previous.x) > 4 || Math.abs(event.clientY - previous.y) > 4) return null;
  let origin = previous.position, initial = view.state.selection;
  const count = event.detail;
  return {
    /** @param update - Source update during the native gesture. */
    update(update) { if (update.docChanged) { origin = update.changes.mapPos(origin); initial = initial.map(update.changes); } },
    /** @param current - Native pointer event. @param extend - Shift selection. @param multiple - Add selection. @returns Selection for CM's own transaction owner. */
    get(current, extend, multiple) {
      const samePoint = Math.abs(current.clientX - previous.x) <= 4 && Math.abs(current.clientY - previous.y) <= 4;
      const position = samePoint ? origin : view.posAtCoords({ x: current.clientX, y: current.clientY }, false);
      const start = clickRange(view.state, origin, count), end = clickRange(view.state, position, count);
      const range = position < origin ? EditorSelection.range(start.to, end.from) : EditorSelection.range(start.from, end.to);
      if (extend) return initial.replaceRange(initial.main.extend(range.from, range.to));
      return multiple ? initial.addRange(range) : EditorSelection.create([range]);
    },
  };
})];
