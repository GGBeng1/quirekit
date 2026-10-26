import { Tree, TreeBuffer, NodeType, type SyntaxNode } from "@lezer/common";
import type { ReferenceSource, ReferenceSummary } from "./types";
import { combineReferences, emptyReferences, referenceLeaf } from "./summary";
import { normalizeIdentifier } from "micromark-util-normalize-identifier";
import { decodeMarkdownDestination, decodeMarkdownString } from "../strings";
import type { MarkdownReference, MarkdownReferenceWork } from "../types";

const summaries = new WeakMap<Tree | TreeBuffer, ReferenceSummary>();
const terminal = /^(?:Paragraph|ATXHeading[1-6]|SetextHeading[12]|FencedCode|CodeBlock|HTMLBlock|Table)$/u;

/** @param tree - Complete tree after inline-only refinement. @param definitions - Confirmed structural-pass definitions, whose block grammar did not change. */
export function retainReferences(tree: Tree, definitions: ReferenceSummary): void { summaries.set(tree, definitions); }

/** @param state - Canonical source. @param node - Confirmed definition. @param offset - Immutable chunk's absolute source base. @returns Decoded definition, or null for incomplete grammar. */
function readDefinition(state: ReferenceSource, node: SyntaxNode, offset: number): MarkdownReference | null {
  const label = node.getChild("LinkLabel"), url = node.getChild("URL"), title = node.getChild("LinkTitle");
  if (!label || !url) return null;
  /** @param token - Token whose container prefixes are not content. @returns Exact field text without quote continuation markers. */
  function text(token: SyntaxNode): string {
    let result = "", from = token.from;
    for (const marker of token.getChildren("QuoteMark")) {
      if (marker.from < from || marker.to > token.to) continue;
      result += state.sliceDoc(offset + from, offset + marker.from);
      from = marker.to + Number(state.sliceDoc(offset + marker.to, offset + marker.to + 1) === " ");
    }
    return result + state.sliceDoc(offset + from, offset + token.to);
  }
  const destination = text(url), rawLabel = text(label).slice(1, -1);
  if (rawLabel.length > 999) return null;
  return Object.freeze({ label: normalizeIdentifier(rawLabel),
    url: decodeMarkdownDestination(destination.startsWith("<") ? destination.slice(1, -1) : destination),
    title: title ? decodeMarkdownString(text(title).slice(1, -1)) : "" });
}

/**
 * Reuses parser-owned immutable chunks; source is read only for newly parsed definitions.
 * @param chunk - Accepted parser chunk, never a fabricated persistent AST.
 * @param offset - Chunk start in the current canonical document.
 * @param state - Source owner used only on a cache miss.
 * @param work - Real work for this root snapshot.
 * @returns Source-ordered definitions, preserving first-definition precedence when combined.
 */
export function collectReferences(chunk: Tree | TreeBuffer, offset: number, state: ReferenceSource, work: { -readonly [K in keyof MarkdownReferenceWork]: MarkdownReferenceWork[K] }): ReferenceSummary {
  const cached = summaries.get(chunk);
  if (cached) { work.reusedChunks++; return cached; }
  let result: ReferenceSummary;
  if (chunk instanceof Tree && terminal.test(chunk.type.name)) { work.visitedNodes++; result = emptyReferences; }
  else if (chunk instanceof Tree && chunk.type.name !== "LinkReference") {
    work.visitedNodes++;
    // Only child links belong to a rebuilt parent. Definition leaves and their
    // ordered subtrees stay shared, without flattening them at each ancestor.
    const children: ReferenceSummary[] = [];
    for (let index = 0; index < chunk.children.length; index++) {
      const child = collectReferences(chunk.children[index]!, offset + chunk.positions[index]!, state, work);
      if (child.size) children.push(child);
    }
    result = combineReferences(children, work);
  } else {
    const definitions: ReferenceSummary[] = [];
    const tree = chunk instanceof Tree ? chunk : new Tree(NodeType.none, [chunk], [0], chunk.length);
    tree.iterate({ enter(node) {
      work.visitedNodes++;
      if (terminal.test(node.name)) return false;
      if (node.name !== "LinkReference") return;
      work.definitionsRead++;
      const definition = readDefinition(state, node.node, offset);
      if (definition) definitions.push(referenceLeaf(definition));
      return false;
    } });
    result = combineReferences(definitions, work);
  }
  summaries.set(chunk, result);
  return result;
}
