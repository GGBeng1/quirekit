import { EditorSelection, type EditorState, type TransactionSpec } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import type { SyntaxNode } from "@lezer/common";
import { readSourcePresentation } from "@quirekit/msfe-core";

/** @param state - Canonical editor state. @returns Whether product document input owns this key gesture. */
export function documentInput(state: EditorState): boolean {
  return proseInput(state) && readSourcePresentation(state).reveal === "hidden";
}

/** @param state - Canonical editor state. @returns Whether either editable Prose presentation owns this gesture. */
export function proseInput(state: EditorState): boolean {
  const { mode, composing } = readSourcePresentation(state);
  return mode === "live" && !state.readOnly && !composing;
}

/** @param state - Source document. @param position - Selection endpoint. @param side - Syntax on the selected side of a boundary. @returns A paragraph split/end, leaving list/quote/code body continuation to Markdown. */
function paragraphBoundary(state: EditorState, position: number, side: -1 | 1 = -1): number | null {
  let boundary: number | null = null;
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, side); node; node = node.parent) {
    if (["ListItem", "Blockquote", "CodeBlock", "Table", "HTMLBlock"].includes(node.name)) return null;
    if (node.name === "FencedCode" || node.name === "Frontmatter") {
      if (node.getChildren(node.name === "FencedCode" ? "CodeMark" : "FrontmatterMark").length !== 2 || position !== node.to) return null;
      boundary = node.to;
    }
    if (node.name === "CustomContainer" && position === node.to && node.getChildren("ContainerMark").length === 2) boundary = node.to;
    if (node.name === "Paragraph" || /^(?:ATXHeading[1-6]|HorizontalRule)$/u.test(node.name)) {
      boundary = position;
    } else if (/^SetextHeading[12]$/u.test(node.name) && position === state.doc.lineAt(node.from).to) {
      boundary = node.to;
    }
  }
  return boundary;
}

/** @param state - Canonical source. @param node - Block being exited. @returns Outer quote/list continuation, retaining exact source indentation. */
function continuationPrefix(state: EditorState, node: SyntaxNode): string {
  const line = state.doc.lineAt(node.from);
  let prefix = state.sliceDoc(line.from, node.from);
  // A fence/table may begin on a list's first line. Preserve the outer quote
  // spelling while replacing only confirmed list markers by equal-width spaces.
  for (let parent = node.parent; parent; parent = parent.parent) {
    const mark = parent.name === "ListItem" ? parent.getChild("ListMark") : null;
    if (mark && mark.from >= line.from && mark.to <= node.from) {
      prefix = prefix.slice(0, mark.from - line.from) + " ".repeat(mark.to - mark.from) + prefix.slice(mark.to - line.from);
    }
  }
  return prefix;
}

/** @param state - Source-owned input draft. @returns One paragraph replacement per supported selection, or native Markdown continuation. */
export function insertDocumentParagraph(state: EditorState): TransactionSpec | null {
  if (!proseInput(state)) return null;
  // Both ends must belong to prose that this command can split. Resolve every
  // range before planning edits so mixed code/list/table selections fall through
  // atomically, while prose replacements retain unselected spaces and markers.
  const boundaries = state.selection.ranges.map(range => range.empty ? paragraphBoundary(state, range.head)
    : paragraphBoundary(state, range.from, 1) === range.from && paragraphBoundary(state, range.to) === range.to ? range.from : null);
  if (boundaries.some(boundary => boundary === null)) return null;
  let index = 0;
  const changes = state.changeByRange(range => {
    const from = boundaries[index++]!;
    return { changes: { from, to: range.empty ? from : range.to, insert: "\n\n" }, range: EditorSelection.cursor(from + 2) };
  });
  return { ...changes, scrollIntoView: true, userEvent: "input" };
}

/** @param state - Source-owned input draft. @returns A paragraph after the nearest enclosing block for Mod-Enter. */
export function exitDocumentBlock(state: EditorState): TransactionSpec | null {
  if (!proseInput(state) || state.selection.ranges.length !== 1 || !state.selection.main.empty) return null;
  const position = state.selection.main.head;
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, -1); node; node = node.parent) {
    if (!["FencedCode", "Frontmatter", "CustomContainer", "Table", "Blockquote", "BulletList", "OrderedList"].includes(node.name)) continue;
    if (node.name === "FencedCode" && node.getChildren("CodeMark").length !== 2
      || node.name === "Frontmatter" && node.getChildren("FrontmatterMark").length !== 2
      || node.name === "CustomContainer" && node.getChildren("ContainerMark").length !== 2) return null;
    const prefix = continuationPrefix(state, node), insert = `\n${prefix}\n${prefix}`;
    return { changes: { from: node.to, insert }, selection: EditorSelection.cursor(node.to + insert.length), scrollIntoView: true, userEvent: "input" };
  }
  return insertDocumentParagraph(state);
}

/** @param state - Canonical source draft. @returns A Markdown hard break retaining outer quote/list prefixes, or native code/source fallback. */
export function insertDocumentLineBreak(state: EditorState): TransactionSpec | null {
  if (!proseInput(state)) return null;
  const owners = state.selection.ranges.map(range => {
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(range.head, -1); node; node = node.parent) {
      if (["FencedCode", "CodeBlock", "Frontmatter", "TableCell", "Table", "HTMLBlock"].includes(node.name)) return null;
      if (node.name === "Paragraph" || node.name === "Task" || /^ATXHeading[1-6]$/u.test(node.name)) {
        return range.from >= node.from && range.to <= node.to ? node : null;
      }
    }
    return null;
  });
  if (owners.some(owner => !owner)) return null;
  let index = 0;
  const changes = state.changeByRange(range => {
    const owner = owners[index++]!, line = state.doc.lineAt(range.from);
    const spaces = / {0,2}$/u.exec(state.sliceDoc(line.from, range.from))![0].length;
    const prefix = continuationPrefix(state, owner);
    const insert = `${" ".repeat(2 - spaces)}\n${prefix}`;
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
  });
  return { ...changes, scrollIntoView: true, userEvent: "input" };
}
