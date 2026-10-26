import { defineCommand, type CommandSpec } from "@quirekit/core";
import { TextSelection, type ResolvedPos } from "@quirekit/pm";

/**
 * Inserts a run-level page break without changing paragraph identity or formatting.
 * @param paragraphNodeNames - Admitted Word paragraph-like textblocks.
 * @returns One atomic, undoable selection replacement command.
 */
export function createInsertWordPageBreakCommand(paragraphNodeNames: readonly string[]): CommandSpec {
  return createInsertWordInlineBreakCommand("wordPageBreak", paragraphNodeNames);
}

/**
 * Inserts a run-level column break without changing paragraph identity or formatting.
 * @param paragraphNodeNames - Admitted Word paragraph-like textblocks.
 * @returns One atomic, undoable selection replacement command.
 */
export function createInsertWordColumnBreakCommand(paragraphNodeNames: readonly string[]): CommandSpec {
  return createInsertWordInlineBreakCommand("wordColumnBreak", paragraphNodeNames);
}

/**
 * Inserts one body-text inline break atom.
 * @param nodeName - Break node type to insert.
 * @param paragraphNodeNames - Admitted Word paragraph-like textblocks.
 * @returns One atomic, undoable selection replacement command.
 */
function createInsertWordInlineBreakCommand(nodeName: string, paragraphNodeNames: readonly string[]): CommandSpec {
  const allowed = new Set(paragraphNodeNames);
  return (options?: { readonly position?: number }) => ({ tr, dispatch, editor }) => {
    // An explicit position inserts there instead of at the selection.
    if (typeof options?.position === "number") {
      if (!Number.isSafeInteger(options.position) || options.position < 0 || options.position > tr.doc.content.size) return false;
      tr.setSelection(TextSelection.create(tr.doc, options.position));
    }
    const selection = tr.selection;
    const type = tr.doc.type.schema.nodes[nodeName];
    if (!(selection instanceof TextSelection) || !type
      || !isBodyTextPosition(selection.$from, allowed)
      || !isBodyTextPosition(selection.$to, allowed)) return false;
    const marks = (tr.storedMarks ?? selection.$from.marks()).filter(mark =>
      editor.extensionManager.splittableMarks.includes(mark.type.name));
    // One source atom owns the boundary. Deletion, split, clipboard and history
    // consequently follow ordinary PM source ranges, without a carrier paragraph.
    tr.replaceSelectionWith(type.create(null, null, marks), false);
    tr.ensureMarks(marks);
    dispatch?.(tr.scrollIntoView());
    return true;
  };
}

/** @param position - Endpoint to admit. @param allowed - Paragraph types. @returns Whether the endpoint is body text outside cells/stories. */
function isBodyTextPosition(position: ResolvedPos, allowed: ReadonlySet<string>): boolean {
  if (!allowed.has(position.parent.type.name)) return false;
  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);
    if (node.type.spec.tableRole || node.type.name === "wordStory"
      || node.type.spec.wordDocumentRootRole === "auxiliary") return false;
  }
  return true;
}

/**
 * Describes a page or column break command for Agents: at the start of a body paragraph, so it begins a new page
 * or column, or at its end, so the following content does.
 * @param run - Break command.
 * @param kind - Page or column break.
 * @returns Described command.
 */
export function describeWordBreakCommand(run: CommandSpec, kind: "page" | "column"): CommandSpec {
  return defineCommand({
    description: `Inserts a ${kind} break in body paragraph \`block\`: at its start (default), so the paragraph begins a new ${kind}, or at its end, so the following content does.`,
    category: "页面",
    target: "block",
    params: {
      type: "object",
      properties: { position: { enum: ["start", "end"], description: "Default \"start\"." } },
      additionalProperties: false
    },
    adapt: (value, { doc, pos }) => {
      const node = pos === null ? null : doc.nodeAt(pos);
      if (pos === null || node === null || !node.isTextblock) return null;
      return { position: (value as { position?: "start" | "end" }).position === "end" ? pos + node.nodeSize - 1 : pos + 1 };
    },
    run
  });
}
