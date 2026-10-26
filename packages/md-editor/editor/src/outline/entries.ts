import type { MsfeEditor, SourceNode } from "@quirekit/msfe-core";
import type { MdOutlineEntry } from "./types";

/** @param node - Syntax child inside a heading. @returns Whether it contributes no visible title text. */
function hidden(node: SourceNode): boolean {
  if (node.kind.endsWith("Mark") || ["LinkTitle", "LinkLabel", "HTMLTag", "Comment"].includes(node.kind)) return true;
  // A plain autolink shows its address; a link or image destination does not.
  return node.kind === "URL" && (node.parentKind === "Link" || node.parentKind === "Image");
}

/** @param source - Canonical document text accessor. @param node - Heading or inline owner. @returns Its visible text in source order. */
function visibleText(source: (from: number, to: number) => string, node: SourceNode): string {
  let text = "", position = node.from;
  for (const child of node.children()) {
    text += source(position, child.from);
    if (!hidden(child)) text += visibleText(source, child);
    position = child.to;
  }
  return text + source(position, node.to);
}

/**
 * Reads the current heading outline from the installed heading semantics.
 * @param editor - Canonical owner with the heading feature installed.
 * @param untitled - Label for a heading without visible text.
 * @returns Entries in document order, or null while parsing has not reached the end.
 */
export function readMdOutline(editor: MsfeEditor, untitled: string): readonly MdOutlineEntry[] | null {
  const { state } = editor, result = editor.querySource("heading", { from: 0, to: state.doc.length });
  if (result.status === "pending") return null;
  const source = (from: number, to: number): string => state.sliceDoc(from, to);
  return result.matches.map(match => ({
    id: `heading-${match.from}`, level: Number(match.attrs.level) || 1, from: match.from,
    text: visibleText(source, match.node).replace(/\s+/gu, " ").trim() || untitled,
  }));
}
