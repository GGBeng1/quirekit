import { EditorSelection, StateEffect, Transaction, type ChangeSpec, type EditorState, type TransactionSpec } from "@quirekit/cm-state";
import { changeOrigin } from "../../state/fields";
import { boundariesActive, boundariesBetween } from "./registry";
import { editingCursor, outsideBlock } from "./selection";
import type { EditingBoundary } from "./types";

/** @param state - Original source. @param boundary - Confirmed owner. @returns Shell intervals including the line breaks required to keep a block structurally separate. */
function shell(state: EditorState, boundary: EditingBoundary): readonly (readonly [number, number])[] {
  if (boundary.kind === "atom" || boundary.kind === "syntax") return [[boundary.from, boundary.to]];
  const from = boundary.kind === "block" ? Math.max(0, state.doc.lineAt(boundary.from).from - 1) : boundary.from;
  const to = boundary.kind === "block" ? Math.min(state.doc.length, state.doc.lineAt(boundary.to).to + 1) : boundary.to;
  return [[from, boundary.contentFrom], [boundary.contentTo, to]].filter(([from, to]) => from! < to!) as [number, number][];
}

/** @param ranges - Deletion intervals. @returns Sorted disjoint intervals, preserving adjacent edits as one change. */
function merge(ranges: readonly (readonly [number, number])[]): [number, number][] {
  const result: [number, number][] = [];
  for (const [from, to] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else if (from < to) result.push([from, to]);
  }
  return result;
}

/** @param from - Requested start. @param to - Requested end. @param protectedRanges - Hidden source to retain. @returns Editable subranges only. */
function subtract(from: number, to: number, protectedRanges: readonly (readonly [number, number])[]): [number, number][] {
  const result: [number, number][] = [];
  for (const [start, end] of merge(protectedRanges)) {
    if (end <= from || start >= to) continue;
    if (start > from) result.push([from, start]);
    from = Math.max(from, end);
  }
  if (from < to) result.push([from, to]);
  return result;
}

/** @param transaction - Native input candidate. @returns The complete accepted source plan, retaining annotations and mapped effects without a delete/reinsert repair. */
export function boundaryInputCorrection(transaction: Transaction): TransactionSpec | null {
  const state = transaction.startState, event = transaction.annotation(Transaction.userEvent);
  if (!transaction.docChanged || !boundariesActive(state) || state.readOnly || transaction.annotation(changeOrigin)
    || !(event?.startsWith("delete") || event?.startsWith("input.")) || event.startsWith("input.type.compose")) return null;
  const deletions: [number, number][] = [], insertions: { from: number; insert: string }[] = [];
  const targets: { from: number; to: number; position: number; inserted: number }[] = [];
  const selectedObjects: { from: number; to: number }[] = [];
  let corrected = false;
  transaction.changes.iterChanges((from, to, _newFrom, _newTo, inserted) => {
    let position = from;
    const text = inserted.toString(), protect: (readonly [number, number])[] = [];
    const owners = boundariesBetween(state, from, to);
    const collapsed = state.selection.ranges.some(range => range.empty && range.head >= from && range.head <= to);
    for (const owner of owners) {
      if (owner.kind === "separator" || owner.deletion === "native") continue;
      const covered = state.selection.ranges.some(range => !range.empty && range.from <= (owner.selectFrom ?? owner.from) && range.to >= (owner.selectTo ?? owner.to));
      if (covered) continue;
      const intervals = shell(state, owner);
      if (owner.kind === "style" && !text && from <= owner.contentFrom && to >= owner.contentTo) {
        deletions.push(...intervals.map(([a, b]): [number, number] => [a, b])); corrected = true;
        continue;
      }
      const touches = intervals.some(([a, b]) => from < b && to > a || from === to && position > a && position < b);
      if (!touches) continue;
      corrected = true;
      if (owner.kind === "atom") {
        protect.push(...intervals);
        if (collapsed && !text) selectedObjects.push(owner);
        if (position > owner.from && position < owner.to) position = owner.to;
        continue;
      }
      const onlyShell = !text && (to <= owner.contentFrom || from >= owner.contentTo);
      if (collapsed && onlyShell && owner.deletion === "unwrap") {
        deletions.push(...intervals.map(([a, b]): [number, number] => [a, b]));
        position = owner.contentFrom;
        protect.push([from, to]);
        continue;
      }
      protect.push(...intervals);
      if (collapsed && owner.kind === "syntax") {
        position = event?.startsWith("delete.forward") ? owner.to : owner.from;
      } else if (collapsed && onlyShell && owner.kind === "block") {
        const forward = event?.startsWith("delete.forward") ?? false;
        position = editingCursor(state, EditorSelection.cursor(outsideBlock(state, owner, forward)), forward ? 1 : -1).head;
      } else if (position >= owner.from && position < owner.contentFrom) position = owner.contentFrom;
      else if (position > owner.contentTo && position <= owner.to) position = owner.contentTo;
    }
    deletions.push(...subtract(from, to, protect));
    if (text) insertions.push({ from: position, insert: text });
    targets.push({ from, to, position, inserted: text.length });
  });
  if (!corrected) return null;
  // Retained source shells split a native replacement into disjoint edits. Apply
  // the complete plan once; never dispatch a partial range or serialize the doc.
  const changes: ChangeSpec[] = merge(deletions).map(([from, to]) => ({ from, to }));
  changes.push(...insertions);
  const accepted = state.changes(changes);
  const ranges = state.selection.ranges.map(range => {
    const object = selectedObjects.find(value => range.head >= value.from && range.head <= value.to);
    if (object) return EditorSelection.range(accepted.mapPos(object.from, -1), accepted.mapPos(object.to, 1));
    const target = targets.find(value => range.head >= value.from && range.head <= value.to || !range.empty && range.from >= value.from && range.to <= value.to);
    // A replacement's old start maps before its new text even with positive
    // association. Advance from that mapped insertion start, including UTF-16.
    return target ? EditorSelection.cursor(target.inserted ? accepted.mapPos(target.position, -1) + target.inserted
      : accepted.mapPos(target.position, 1)) : range.map(accepted);
  });
  const correction = transaction.changes.invert(state.doc).compose(accepted);
  return { changes: accepted, selection: EditorSelection.create(ranges, state.selection.mainIndex),
    effects: StateEffect.mapEffects(transaction.effects, correction), annotations: transaction.annotations, scrollIntoView: transaction.scrollIntoView };
}
