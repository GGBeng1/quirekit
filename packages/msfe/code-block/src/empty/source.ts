import { EditorSelection } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation, sourceDocument, sourceNode, type MsfeCommand, type SourceDocument, type SourceNode } from "@quirekit/msfe-core";

/** @param document - Canonical source. @param node - Confirmed fence. @returns Closing line only when no body row exists. */
export function emptyCodeLine(document: SourceDocument, node: SourceNode) {
  const marks = node.children("CodeMark"), first = marks[0], last = marks[1];
  if (node.kind !== "FencedCode" || marks.length !== 2 || !first || !last) return null;
  const start = document.lineAt(first.from), end = document.lineAt(last.from);
  return end.number === start.number + 1 ? { line: end, prefix: document.slice(end.from, last.from) } : null;
}

/** @param from - Current mapped fence start. @returns One undoable real code row, or refusal for stale/nonempty/IME targets. */
export function materializeCodeLine(from: number): MsfeCommand {
  return state => {
    if (state.readOnly || readSourcePresentation(state).composing || from < 0 || from > state.doc.length) return null;
    let node = syntaxTree(state).resolveInner(from, 1);
    while (node.parent && node.name !== "FencedCode") node = node.parent;
    if (node.name !== "FencedCode" || node.from !== from) return null;
    const empty = emptyCodeLine(sourceDocument(state), sourceNode(node));
    if (!empty) return null;
    return { changes: { from: empty.line.from, insert: `${empty.prefix}\n` },
      selection: EditorSelection.cursor(empty.line.from + empty.prefix.length), scrollIntoView: true };
  };
}
