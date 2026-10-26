import type { Editor } from "@quirekit/core";
import type { BlockMathOpenOptions, BlockMathRequest } from "./types";

const hosts = new WeakMap<Editor, (request: BlockMathRequest) => void>();

/** @param editor - Document owner. @param open - Mounted UI callback. @returns Idempotent host release. */
export function registerBlockMathHost(editor: Editor, open: (request: BlockMathRequest) => void): () => void {
  hosts.set(editor, open);
  return () => { if (hosts.get(editor) === open) hosts.delete(editor); };
}

/** @param editor - Document owner. @param display - Insertion mode. @param options - Explicit source or captured destination. @returns Whether a task was opened. */
export function openBlockMath(editor: Editor, display = false, options: BlockMathOpenOptions = {}): boolean {
  const open = hosts.get(editor);
  if (!open || !editor.isEditable || editor.isDestroyed) return false;
  const doc = editor.state.doc, { from, to } = editor.state.pm.selection;
  if (options.position !== undefined && (!Number.isInteger(options.position) || options.position < 0 || options.position >= doc.content.size)) return false;
  const node = options.position === undefined ? undefined : doc.nodeAt(options.position);
  if (options.position !== undefined && (!node || !["inlineMath", "displayMath"].includes(node.type.name))) return false;
  if (!editor.state.schema.nodes[display ? "displayMath" : "inlineMath"]) return false;
  open({ doc, display: node ? node.type.name === "displayMath" : display, latex: node?.attrs.latex ?? "",
    range: node ? { from: options.position!, to: options.position! + node.nodeSize } : options.range ?? { from, to },
    ...(node ? { node } : {}), ...(options.destination ? { destination: options.destination } : {}) });
  return true;
}

/** @param editor - Canonical owner. @param request - Original task. @param latex - Validated draft. @returns Whether one source-bound transaction succeeded. */
export function commitBlockMath(editor: Editor, request: BlockMathRequest, latex: string): boolean {
  if (editor.isDestroyed || !editor.isEditable || editor.state.doc !== request.doc) return false;
  const accepted = request.node
    ? editor.commands.updateBlockMath({ position: request.range.from, expected: request.node, expectedDocument: request.doc, latex })
    : editor.commands.insertBlockMath({ latex, display: request.display, position: request.range, expectedDocument: request.doc,
      ...(request.destination ? { destination: request.destination } : {}) });
  if (accepted) editor.commands.closeHistory();
  return accepted;
}
