import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { Tree } from "@lezer/common";
import { requestMarkdownParse } from "@quirekit/msfe-core";
import type { FootnoteEntry, FootnoteIndex, FootnoteOccurrence, FootnoteWork } from "./types";

const indexes = new WeakMap<Tree, { index: FootnoteIndex; work: FootnoteWork }>();
const pending: FootnoteIndex = { status: "pending", entries: new Map(), inline: new Map() };

/** @param label - Raw parser-confirmed identifier. @returns Case-folded label, retaining punctuation and spelling in the source. */
export function normalizeFootnoteLabel(label: string): string { return label.toLowerCase().toUpperCase(); }

/** @param state - Accepted source snapshot. @returns Shared first-definition and first-use index; incomplete trees request the single core scheduler. */
export function queryFootnotes(state: EditorState): FootnoteIndex {
  const tree = syntaxTree(state);
  if (!syntaxTreeAvailable(state, state.doc.length) || tree.length < state.doc.length) { requestMarkdownParse(state); return pending; }
  const cached = indexes.get(tree);
  if (cached) return cached.index;
  const definitions = new Map<string, FootnoteOccurrence>(), references: FootnoteOccurrence[] = [];
  const inline = new Map<number, number>();
  let visitedNodes = 0;
  tree.iterate({ enter(node) {
    visitedNodes++;
    if (node.name === "InlineFootnote") { inline.set(node.from, 0); return; }
    if (node.name !== "FootnoteReference" && node.name !== "FootnoteDefinition") return;
    const token = node.node.getChild("FootnoteLabel");
    if (!token) return;
    const label = normalizeFootnoteLabel(state.sliceDoc(token.from, token.to));
    const occurrence = Object.freeze({ label, from: node.from, to: node.to });
    if (node.name === "FootnoteReference") { references.push(occurrence); return false; }
    if (!definitions.has(label)) definitions.set(label, occurrence);
    // Definition bodies still contain real block/inline syntax, including references.
  } });
  const grouped = new Map<string, FootnoteOccurrence[]>(), numbers = new Map<string, number>();
  for (const reference of references) {
    const group = grouped.get(reference.label);
    if (group) group.push(reference); else grouped.set(reference.label, [reference]);
  }
  // Merge canonical use positions, never definition order, so both spellings share one numbering scheme.
  let number = 0;
  const uses = [...references.map(reference => ({ from: reference.from, label: reference.label })),
    ...[...inline.keys()].map(from => ({ from, label: null }))].sort((a, b) => a.from - b.from);
  for (const use of uses) {
    if (use.label === null) inline.set(use.from, ++number);
    else if (definitions.has(use.label) && !numbers.has(use.label)) numbers.set(use.label, ++number);
  }
  const entries = new Map<string, FootnoteEntry>();
  for (const label of new Set([...definitions.keys(), ...grouped.keys()])) entries.set(label, Object.freeze({
    definition: definitions.get(label), references: Object.freeze(grouped.get(label) ?? []), number: numbers.get(label),
  }));
  const index: FootnoteIndex = Object.freeze({ status: "ready", entries, inline });
  indexes.set(tree, { index, work: Object.freeze({ builds: 1, visitedNodes }) });
  return index;
}

/** @param state - Immutable source. @returns Work counters without starting a parse or index build. */
export function getFootnoteWork(state: EditorState): FootnoteWork {
  return { ...(indexes.get(syntaxTree(state))?.work ?? { builds: 0, visitedNodes: 0 }) };
}
