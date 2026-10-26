import { RangeSet, RangeValue, type EditorState, type Transaction } from "@quirekit/cm-state";
import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import { changedSyntaxRanges, mapSourceRange, touchesSourceRanges, requestMarkdownParse,
  sourceDocument, sourceNode, type SourceDocument, type SourceNode } from "@quirekit/msfe-core";
import type { ContainerAttributes, ContainerEntry, ContainerIndex, ContainerIndexWork } from "./types";

const work = new WeakMap<EditorState, ContainerIndexWork>();

/** @param state - Accepted or speculative source state. @returns Detached disclosure-query counters without starting work. */
export function getContainerIndexWork(state: EditorState): ContainerIndexWork {
  return { ...work.get(state) ?? { queries: 0, visitedNodes: 0 } };
}

/** @param before - Previous immutable state. @param after - New state, including selection-only updates. */
export function inheritContainerIndexWork(before: EditorState, after: EditorState): void {
  const count = work.get(before);
  if (count && !work.has(after)) work.set(after, count);
}

/** @param document - Canonical source. @param node - Confirmed syntax. @returns Literal fields only for explicitly closed containers. */
export function readContainer(document: SourceDocument, node: SourceNode): ContainerAttributes | null {
  const name = node.child("ContainerName"), title = node.child("ContainerTitle");
  return name && node.children("ContainerMark").length === 2
    ? { name: document.slice(name.from, name.to), title: title ? document.slice(title.from, title.to) : "" } : null;
}

/** A source-derived interval; this is an index, never a persistent document node. */
export class ContainerRange extends RangeValue {
  /** @param entry - Confirmed immutable owner. */
  constructor(readonly entry: ContainerEntry) { super(); }
}

/** @param state - Accepted parser snapshot. @param previous - Previously confirmed index, when updating.
 * @param transaction - Exact state and coordinate mapping for that index.
 * @returns Complete details index or visible-source fallback while parsing is pending. */
export function collectContainers(state: EditorState, previous?: ContainerIndex, transaction?: Transaction): ContainerIndex {
  const count = work.get(transaction?.startState ?? state) ?? { queries: 0, visitedNodes: 0 };
  work.set(state, count);
  const tree = syntaxTree(state), found = new Map<number, ContainerEntry>();
  const ready = syntaxTreeAvailable(state, state.doc.length) && tree.length >= state.doc.length;
  if (!ready) requestMarkdownParse(state);
  else {
    const dirty = previous?.ready && transaction
      ? changedSyntaxRanges(transaction.startState, state, transaction.changes) : [{ from: 0, to: state.doc.length }];
    // The common syntax diff owns structural context. Retain only mapped owners
    // outside it; incomplete parses never preserve stale hidden content.
    if (previous?.ready && transaction) for (const entry of previous.entries) {
      const mapped = mapSourceRange({ ...entry, id: "container", value: entry }, transaction.changes);
      if (!mapped || touchesSourceRanges(mapped, dirty)) continue;
      const headerEnd = transaction.changes.mapPos(entry.headerEnd, -1);
      found.set(mapped.from, mapped.from === entry.from && mapped.to === entry.to && headerEnd === entry.headerEnd
        ? entry : { ...entry, from: mapped.from, to: mapped.to, headerEnd });
    }
    for (const range of dirty) {
      count.queries++;
      tree.iterate({ ...range, enter(reference) {
        count.visitedNodes++;
        if (!touchesSourceRanges(reference, [range])) return false;
        if (reference.name !== "CustomContainer") return;
        const node = sourceNode(reference.node), attrs = readContainer(sourceDocument(state), node);
        if (attrs?.name === "details") found.set(node.from, { ...attrs, from: node.from, to: node.to, headerEnd: state.doc.lineAt(node.from).to });
      } });
    }
  }
  const entries = [...found.values()].sort((a, b) => a.from - b.from);
  return { tree, doc: state.doc, ready, entries,
    ranges: RangeSet.of(entries.map(entry => new ContainerRange(entry).range(entry.headerEnd, entry.to)), true) };
}

/** @param ranges - Retained hidden intervals. @param position - Current source endpoint. @returns Whether the position lies strictly inside a closed body. */
export function insideContainer(ranges: RangeSet<ContainerRange>, position: number): boolean {
  let inside = false;
  ranges.between(position, position, (from, to) => { if (position > from && position < to) inside = true; });
  return inside;
}
