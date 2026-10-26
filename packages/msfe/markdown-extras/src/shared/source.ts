import type { SourceDocument, SourceNode } from "@quirekit/msfe-core";

/** @param document - Canonical source. @param node - Confirmed delimited node. @param kind - Owning delimiter kind.
 * @returns Raw body or null for an incomplete container. */
export function delimitedBody(document: SourceDocument, node: SourceNode, kind: string): string | null {
  const marks = node.children(kind);
  if (marks.length !== 2) return null;
  if (node.kind !== "InlineMath") return node.children(`${node.kind}Text`).map(line => document.slice(line.from, line.to)).join("\n");
  return document.slice(marks[0]!.to, marks[1]!.from).replace(/^\n|\n$/gu, "");
}
