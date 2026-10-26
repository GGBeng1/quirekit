import { isSourceRevealed, type EditingBoundaryRule } from "@quirekit/msfe-core";

/** The language header and both fences belong to the block, never to its literal code body. */
export const codeBlockBoundary: EditingBoundaryRule = { nodes: ["FencedCode"], when: "prose",
  /** @param context - Confirmed canonical code block. @returns Protected shell with real body endpoints; unclosed code remains literal. */
  resolve({ state, node }) {
    if (isSourceRevealed(state, node)) return null;
    const marks = node.getChildren("CodeMark"), opening = marks[0], closing = marks[1];
    if (marks.length !== 2 || !opening || !closing) return null;
    const first = state.doc.lineAt(opening.from), last = state.doc.lineAt(closing.from);
    if (last.number === first.number + 1) return { from: node.from, to: node.to, contentFrom: node.from, contentTo: node.to, kind: "atom", deletion: "protect" };
    const body = state.doc.line(first.number + 1), prefix = closing.from - last.from;
    const contentFrom = node.getChild("CodeText")?.from ?? Math.min(body.to, body.from + prefix);
    return { from: node.from, to: node.to, contentFrom, contentTo: state.doc.line(last.number - 1).to, kind: "block", deletion: "protect" };
  },
};
