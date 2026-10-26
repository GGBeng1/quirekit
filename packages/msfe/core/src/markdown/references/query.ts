import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { Tree } from "@lezer/common";
import { normalizeIdentifier } from "micromark-util-normalize-identifier";
import { collectReferences } from "./collect";
import { referenceEntries } from "./summary";
import type { ReferenceSummary } from "./types";
import { requestMarkdownParse } from "../../source/parsing/demand";
import type { MarkdownReference, MarkdownReferenceResult, MarkdownReferenceWork } from "../types";

const indexes = new WeakMap<Tree, { readonly definitions: ReadonlyMap<string, MarkdownReference>; readonly work: MarkdownReferenceWork }>();
const maps = new WeakMap<ReferenceSummary, ReadonlyMap<string, MarkdownReference>>();

/** @param state - Canonical syntax snapshot. @param label - Raw label without brackets. @returns Confirmed first definition, missing, or a non-blocking pending result. */
export function resolveMarkdownReference(state: EditorState, label: string): MarkdownReferenceResult {
  const tree = syntaxTree(state);
  // Background parsing may have advanced its context before the new tree is
  // accepted in this state. Never report absence from that older partial tree.
  if (!syntaxTreeAvailable(state, state.doc.length) || tree.length < state.doc.length) {
    requestMarkdownParse(state);
    return { status: "pending" };
  }
  if (!label || label.length > 999) return { status: "missing" };
  let index = indexes.get(tree);
  if (!index) {
    const work = { builds: 0, visitedNodes: 0, reusedChunks: 0, definitionsRead: 0, copiedDefinitions: 0, summaryLinks: 0, definitions: 0 };
    const summary = collectReferences(tree, 0, state, work);
    let definitions = maps.get(summary);
    if (!definitions) {
      const built = new Map<string, MarkdownReference>(); work.builds++;
      for (const definition of referenceEntries(summary)) {
        if (!built.has(definition.label)) built.set(definition.label, definition);
      }
      definitions = built; maps.set(summary, definitions);
    }
    work.definitions = definitions.size;
    index = { definitions, work: Object.freeze(work) }; indexes.set(tree, index);
  }
  const definition = index.definitions.get(normalizeIdentifier(label));
  return definition ? { status: "resolved", definition } : { status: "missing" };
}

/** @param state - Current immutable source. @returns Detached counters without triggering reference indexing. */
export function getMarkdownReferenceWork(state: EditorState): MarkdownReferenceWork {
  return { ...(indexes.get(syntaxTree(state))?.work ?? { builds: 0, visitedNodes: 0, reusedChunks: 0, definitionsRead: 0, copiedDefinitions: 0, summaryLinks: 0, definitions: 0 }) };
}
