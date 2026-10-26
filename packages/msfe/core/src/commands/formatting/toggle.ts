import { EditorSelection, type EditorState, type SelectionRange } from "@quirekit/cm-state";
import type { MsfeCommand } from "../../state/types";
import { inlineSpans, querySourceInline } from "./context";
import { validMarkChange } from "./validation";
import type { SourceMarkFormat, SourceMarkPlan } from "./types";

/** @param state - Accepted source. @param range - One directed selection. @param format - Feature grammar. @returns An unpublished semantic edit, or refusal. */
function plan(state: EditorState, range: SelectionRange, format: SourceMarkFormat): SourceMarkPlan | null {
  const query = querySourceInline(state, range), owner = query.node;
  if (!owner && !query.reason && range.empty) return { changes: [{ from: range.from, insert: format.marker + format.marker }],
    range: EditorSelection.cursor(range.from + format.marker.length), from: range.from, to: range.to };
  if (!owner || owner.to - owner.from > 20_000) return null;
  const spans = inlineSpans(owner);
  let from = range.from, to = range.to;
  // Whole-body selection includes hidden syntax shells. Expand inside-out before
  // testing an outer format against the actual surrounding delimiter context.
  for (const span of [...spans].sort((a, b) => a.node.to - a.node.from - (b.node.to - b.node.from))) {
    if (!range.empty && from === span.from && to === span.to) { from = span.node.from; to = span.node.to; }
  }
  const active = spans.filter(span => span.node.name === format.node && span.node.firstChild?.name === format.markerNode
    && span.from <= range.from && span.to >= range.to).sort((a, b) => a.to - a.from - (b.to - b.from))[0];
  if (active && !range.empty && !(from <= active.node.from && to >= active.node.to)) return null;
  // A range must not split a paired owner. Complete nested marks remain legal.
  if (spans.some(span => span.node.from < from && from < span.from || span.to < to && to < span.node.to
    || from < span.node.from && span.node.from < to && to < span.node.to
    || span.node.from < from && from < span.node.to && span.node.to < to)) return null;
  const edits = active ? [{ from: active.node.from, to: active.from }, { from: active.to, to: active.node.to }]
    : from === to ? [{ from, insert: format.marker + format.marker }]
      : [{ from, insert: format.marker }, { from: to, insert: format.marker }];
  const changes = state.changes(edits);
  const low = changes.mapPos(range.from, 1), high = changes.mapPos(range.to, -1);
  const selected = !active && range.empty ? EditorSelection.cursor(from + format.marker.length)
    : EditorSelection.range(range.anchor <= range.head ? low : high, range.anchor <= range.head ? high : low);
  if ((!range.empty || active) && !validMarkChange(state, changes, selected, spans, format, active)) return null;
  return { changes: edits, range: selected, from: active?.node.from ?? from, to: active?.node.to ?? to };
}

/**
 * Toggles a parser-confirmed format without replacing Markdown with another document model.
 * @param format - Owning feature's syntax and source spelling.
 * @returns A pure atomic command; unsafe combinations leave source and history unchanged.
 */
export function toggleSourceMark(format: SourceMarkFormat): MsfeCommand {
  if (!format.node || !format.markerNode || !format.marker || /\s/u.test(format.marker)) throw new Error("invalid-source-mark");
  return state => {
    const plans = state.selection.ranges.map(range => plan(state, range, format));
    if (plans.some(value => !value)) return null;
    for (let index = 1; index < plans.length; index++) if (plans[index]!.from <= plans[index - 1]!.to) return null;
    let index = 0;
    return state.changeByRange(() => plans[index++]!);
  };
}
