import { readSourcePresentation, type EditingBoundaryRule } from "@quirekit/msfe-core";
import type { EditorState, Line } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import type { SyntaxNode } from "@lezer/common";

/** Only gaps in known Prose flow may collapse; plugin-owned source remains literal by default. */
const proseFlow = new Set(["Document", "Blockquote", "QuoteMark", "BulletList", "OrderedList", "ListItem", "CustomContainer"]);

/** @param text - One source line. @returns Whether only paragraph/quote separation occupies this line. */
function blankSeparator(text: string): boolean { return /^\s*(?:>\s*)*$/u.test(text); }

/** @param state - Canonical source and accepted presentation. @param line - Visible source line. @returns Whether this source separator can safely lose its line box. */
export function collapseBlankLine(state: EditorState, line: Line): boolean {
  const { mode } = readSourcePresentation(state);
  if (mode === "source" || !blankSeparator(line.text)) return false;
  let flowEnd = state.doc.length;
  // The final prefix on a nested blank row belongs to its innermost flow.
  // Its terminal row is authored content, just like the document's EOF row.
  for (let owner: SyntaxNode | null = syntaxTree(state).resolveInner(line.to, -1); owner; owner = owner.parent) {
    if (!proseFlow.has(owner.name)) return false;
    if (owner.name !== "QuoteMark") flowEnd = Math.min(flowEnd, owner.to);
  }
  // Structural separators use existing paragraph margins in every caret state.
  // Authored empty paragraphs and EOF still own real line boxes, so Enter is
  // visible immediately without adding height when merely moving the caret.
  if (line.from === 0 || line.to >= flowEnd) return false;
  return !blankSeparator(state.doc.line(line.number - 1).text);
}

/** One collapsed separator uses neighboring paragraph edges for every operation. */
export const separatorBoundary: EditingBoundaryRule = { nodes: ["Document"], when: "prose",
  /** @param context - Current line and canonical source. @returns A navigable interval whose deletion still joins paragraphs natively. */
  resolve({ state, position }) {
    const line = state.doc.lineAt(position);
    return collapseBlankLine(state, line) ? { from: line.from - 1, to: line.to + 1, contentFrom: line.from - 1,
      contentTo: line.to + 1, kind: "separator", deletion: "native" } : null;
  },
};
