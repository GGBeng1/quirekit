import type { SourceBlockScopeResolver } from "@quirekit/msfe-core";

/** @param state - Accepted source. @param node - Candidate container. @returns Body sibling flow excluding delimiters, or rejection for an unfinished fenced owner. */
export const containerBlockScope: SourceBlockScopeResolver = (state, node) => {
  // Raw fenced owners can exclude the last newline. Reject that unfinished
  // boundary before it is exposed as an independent blank insertion position.
  if (node.name === "DisplayMath" || node.name === "Frontmatter") return node.getChildren(`${node.name}Mark`).length === 2 ? null : false;
  if (node.name !== "CustomContainer") return null;
  const marks = node.getChildren("ContainerMark");
  if (marks.length !== 2) return false;
  return { from: state.doc.lineAt(node.from).to + 1, to: state.doc.lineAt(marks[1]!.from).from - 1 };
};
