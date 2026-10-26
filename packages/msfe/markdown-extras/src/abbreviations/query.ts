import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { Tree } from "@lezer/common";
import { decodeMarkdownString, requestMarkdownParse } from "@quirekit/msfe-core";
import type { AbbreviationIndex } from "./types";

const indexes = new WeakMap<Tree, AbbreviationIndex>();
const empty: AbbreviationIndex = { status: "pending", definitions: new Map(), pattern: null };

/** @param state - Canonical snapshot. @returns A complete or explicitly pending shared definition index; selection does not invalidate it. */
export function queryAbbreviations(state: EditorState): AbbreviationIndex {
  const tree = syntaxTree(state);
  if (!syntaxTreeAvailable(state, state.doc.length) || tree.length < state.doc.length) { requestMarkdownParse(state); return empty; }
  const cached = indexes.get(tree);
  if (cached) return cached;
  const definitions = new Map<string, string>();
  tree.iterate({ enter(reference) {
    if (reference.name !== "AbbreviationDefinition") return;
    const label = reference.node.getChild("AbbreviationLabel"), title = reference.node.getChild("AbbreviationTitle");
    if (label && title) {
      const key = decodeMarkdownString(state.sliceDoc(label.from, label.to));
      if (!definitions.has(key)) definitions.set(key, decodeMarkdownString(state.sliceDoc(title.from, title.to)));
    }
    return false;
  } });
  const pattern = [...definitions.keys()].sort((a, b) => b.length - a.length).map(key => key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
  const index: AbbreviationIndex = { status: "ready", definitions, pattern: pattern || null };
  indexes.set(tree, index); return index;
}
