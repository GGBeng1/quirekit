import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { parseWhiteboard, serializeWhiteboard, type WhiteboardDocument } from "@quirekit/whiteboard";
import type { MsfeWhiteboardAttributes } from "./types";

/** @param board - Validated envelope. @returns Standalone canonical Markdown fence. */
export function whiteboardMarkdown(board: WhiteboardDocument): string { return `\`\`\`quirekit-whiteboard\n${serializeWhiteboard(board)}\n\`\`\``; }
/** @param document - Source authority. @param node - Confirmed fence. @returns Parsed board, or unchanged source fallback. */
export function readWhiteboardSource(document: SourceDocument, node: SourceNode): MsfeWhiteboardAttributes | null {
  const info = node.child("CodeInfo"), marks = node.children("CodeMark");
  if (marks.length !== 2 || !info || node.parentKind !== "Document" || document.slice(info.from, info.to).trim() !== "quirekit-whiteboard") return null;
  try { return { board: parseWhiteboard(document.slice(document.lineAt(marks[0]!.from).to + 1, document.lineAt(marks[1]!.from).from)) }; }
  catch { return null; }
}
/** @param document - Source authority. @param node - Current fence. @param patch - Complete replacement board. @returns Canonical replacement or refusal. */
export function patchWhiteboardSource(document: SourceDocument, node: SourceNode, patch: Partial<MsfeWhiteboardAttributes>): SourceEdit | null {
  const current = readWhiteboardSource(document, node);
  if (!current || !patch.board || Object.keys(patch).some(key => key !== "board") || patch.board.id !== current.board.id || patch.board.revision !== current.board.revision + 1) return null;
  try { return { from: node.from, to: node.to, insert: whiteboardMarkdown(patch.board) }; } catch { return null; }
}
