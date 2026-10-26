import { readSourceDestination, type ProjectionInput, type ProjectionReplacement } from "@quirekit/msfe-core";

/**
 * Hides confirmed link syntax in the direct layout layer, including multiline destinations.
 * @param input - Canonical source snapshot; selection reveal is applied by core.
 * @param name - Configured semantic link owner.
 * @returns Source-mapped inline-flow replacements without a second rendered label.
 */
export function linkSyntax(input: ProjectionInput, name: string): readonly ProjectionReplacement[] {
  const result: ProjectionReplacement[] = [];
  for (const match of input.query(name).matches) {
    // Ordinary one-line links remain viewport-owned, keeping caret updates independent
    // of the document-wide link count. Only cross-line owners need direct layout ranges.
    if (input.document.lineAt(match.from).number === input.document.lineAt(match.to).number) continue;
    const value = readSourceDestination(input.document, match.node);
    if (!value || value.labelFrom === value.labelTo) continue;
    for (const [from, to] of [[match.from, value.labelFrom], [value.labelTo, match.to]]) {
      if (from! < to!) result.push({ type: "replace", from: from!, to: to!, block: false,
        key: `${match.from}/${from}`, revealRange: { from: match.from, to: match.to } });
    }
  }
  return result;
}
