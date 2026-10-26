import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { ChangeSpec, EditorState } from "@quirekit/cm-state";
import type { MsfeSourceRange } from "../../views/types";
import type { SourceMatch, SourceQuery, SourceType } from "./types";
import { sourceNode } from "../authoring/adapter";

/** @param state - Canonical or draft state. @param type - Installed type. @param ranges - Bounded source intervals.
 * @param visit - Optional diagnostic instrumentation for each visited parser node.
 * @returns Confirmed source snapshots and parse coverage, without forcing a synchronous parse. */
export function querySource(state: EditorState, type: SourceType | undefined, ranges: readonly MsfeSourceRange[], visit?: () => void): SourceQuery {
  if (!type) return { status: "unsupported", matches: [] };
  const matches = new Map<string, SourceMatch>();
  let ready = true;
  for (const { from, to } of ranges) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > state.doc.length) throw new RangeError("invalid-source-range");
    ready &&= syntaxTreeAvailable(state, to);
    syntaxTree(state).iterate({ from, to, enter(reference) {
      visit?.();
      if (!type.codec.nodes.includes(reference.name)) return;
      if (from === to ? reference.from > from || reference.to < to : reference.from >= to || reference.to <= from) return;
      const attrs = type.codec.read(state, reference.node);
      if (attrs) matches.set(`${reference.from}:${reference.to}`, {
        name: type.name, kind: type.kind, node: sourceNode(reference.node), from: reference.from, to: reference.to, attrs: Object.freeze({ ...attrs }),
      });
    } });
  }
  return { status: ready ? "ready" : "pending", matches: [...matches.values()] };
}

/** @param query - Decoded query. @param ranges - Selection ranges. @returns Innermost owner for every selection, or null. */
export function selectedSources(query: SourceQuery, ranges: readonly MsfeSourceRange[]): readonly SourceMatch[] | null {
  if (query.status !== "ready") return null;
  const result = new Map<string, SourceMatch>();
  for (const range of ranges) {
    const match = query.matches.filter(item => item.from <= range.from && item.to >= range.to)
      .sort((a, b) => a.to - a.from - (b.to - b.from))[0];
    if (!match) return null;
    result.set(`${match.from}:${match.to}`, match);
  }
  return [...result.values()];
}

/** @param state - Current command draft. @param type - Installed codec. @param patch - Persisted fields.
 * @returns Atomic exact changes for selected semantic owners, or refusal. */
export function patchAttributes(state: EditorState, type: SourceType | undefined, patch: object): ChangeSpec | null {
  const matches = selectedSources(querySource(state, type, state.selection.ranges), state.selection.ranges);
  if (!type || !matches?.length) return null;
  const changes: ChangeSpec[] = [];
  let end = -1;
  for (const match of [...matches].sort((a, b) => a.from - b.from)) {
    if (match.from < end) return null;
    end = match.to;
    let node = syntaxTree(state).resolveInner(match.from, 1);
    while (node.parent && (node.from !== match.from || node.to !== match.to || !type.codec.nodes.includes(node.name))) node = node.parent;
    const edits = type.codec.patch(state, node, patch);
    if (edits === null) return null;
    changes.push(edits);
  }
  return changes;
}
