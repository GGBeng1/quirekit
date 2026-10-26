import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { SourceDocument, SourceNode } from "./types";
import { resolveMarkdownReference } from "../../markdown/references/query";

/** @param state - Backend state. @returns Bounded source access without serialization. */
export function sourceDocument(state: EditorState): SourceDocument {
  return { length: state.doc.length, slice: (from, to) => state.sliceDoc(from, to), lineAt: position => state.doc.lineAt(position),
    resolveReference: label => resolveMarkdownReference(state, label) };
}

/** @param node - Backend syntax. @returns Lazy parser-neutral syntax facade. */
export function sourceNode(node: SyntaxNode): SourceNode {
  return { kind: node.name, parentKind: node.parent?.name ?? null, from: node.from, to: node.to,
    parent: () => node.parent ? sourceNode(node.parent) : null,
    child(kind) { const child = node.getChild(kind); return child ? sourceNode(child) : null; },
    children(kind) {
      if (kind) return node.getChildren(kind).map(child => sourceNode(child));
      const result: SourceNode[] = [];
      for (let child = node.firstChild; child; child = child.nextSibling) result.push(sourceNode(child));
      return result;
    },
  };
}
