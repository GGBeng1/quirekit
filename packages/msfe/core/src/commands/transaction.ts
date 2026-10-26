import { EditorSelection, type EditorState, type Transaction, type TransactionSpec } from "@quirekit/cm-state";
import { isolateHistory } from "@quirekit/cm-commands";
import { changeOrigin } from "../state/fields";
import type { MsfeCommand } from "../state/types";

/**
 * Plans a whole command chain against immutable intermediate states.
 * @param state - Current canonical state.
 * @param commands - Ordered, pure command planners.
 * @param selection - Optional captured target in this same source revision.
 * @returns One atomic transaction, or null without changing the canonical state.
 */
export function buildCommandTransaction(
  state: EditorState, commands: readonly MsfeCommand[], selection?: EditorSelection,
): Transaction | null {
  if (state.readOnly || commands.length === 0) return null;
  const specs: TransactionSpec[] = selection ? [{ selection }] : [];
  let draft = selection ? state.update({ selection }).state : state;
  // Every planner sees preceding changes; rejection never publishes the partial draft.
  for (const command of commands) {
    const spec = command(draft);
    if (spec === null) return null;
    specs.push({ ...spec, sequential: true });
    draft = draft.update(spec).state;
  }
  return state.update(...specs, { annotations: [changeOrigin.of("command"), isolateHistory.of("full")] });
}

/**
 * Creates a multi-selection delimiter toggle without a Markdown serialization roundtrip.
 * @param marker - Exact opening and closing marker to insert or remove.
 * @returns A pure source command retaining selection direction.
 */
export function toggleDelimiter(marker: string): MsfeCommand {
  if (!marker || /\s/u.test(marker)) throw new Error("invalid-delimiter");
  return state => state.changeByRange(range => {
    const size = marker.length;
    const partialRun = size === 1 && marker === "*"
      && state.sliceDoc(Math.max(0, range.from - 2), range.from) === "**"
      && state.sliceDoc(Math.max(0, range.from - 3), range.from) !== "***";
    const wrapped = !partialRun && range.from >= size && range.to + size <= state.doc.length
      && state.sliceDoc(range.from - size, range.from) === marker
      && state.sliceDoc(range.to, range.to + size) === marker;
    if (wrapped) return {
      changes: [{ from: range.from - size, to: range.from }, { from: range.to, to: range.to + size }],
      range: EditorSelection.range(range.anchor - size, range.head - size),
    };
    // Empty selections become an insertion between the two markers in one change.
    return {
      changes: range.empty
        ? { from: range.from, insert: marker + marker }
        : [{ from: range.from, insert: marker }, { from: range.to, insert: marker }],
      range: EditorSelection.range(range.anchor + size, range.head + size),
    };
  });
}
