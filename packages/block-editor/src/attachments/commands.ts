import type { CommandProps, RawCommands } from "@quirekit/core";
import { closeHistory, Fragment, NodeSelection, type Node as PMNode } from "@quirekit/pm";
import type { BlockAttachmentView } from "./types";

declare module "@quirekit/core" {
  /** Attachment presentation remains separate from audio/video playback. */
  interface Commands<ReturnType> {
    /** Source-bound file presentation. */
    readonly blockAttachment: {
      /** @param position - Exact source boundary. @param node - Expected immutable file node. @param view - Destination. @returns Whether the transform fits the current schema. */
      readonly setBlockAttachmentView: (position: number, node: PMNode, view: BlockAttachmentView) => ReturnType;
    };
  }
}

/** @param context - Current transaction. @param position - Inline occurrence. @param node - Source atom. @returns Whether a lossless paragraph split is admitted. */
function expandInline(context: CommandProps, position: number, node: PMNode): boolean {
  const { tr, state, dispatch } = context, $pos = tr.doc.resolve(position), parent = $pos.parent, type = state.schema.nodes.blockAsset;
  if (!type || !$pos.depth || !parent.isTextblock) return false;
  const before = parent.content.cut(0, $pos.parentOffset), after = parent.content.cut($pos.parentOffset + node.nodeSize);
  const block = type.create({ ...node.attrs, kind: "attachment", blockId: before.size ? null : parent.attrs.blockId });
  const nodes: PMNode[] = [];
  if (before.size) nodes.push(parent.copy(before));
  nodes.push(block);
  if (after.size) nodes.push(parent.type.create({ ...parent.attrs, blockId: null }, after, parent.marks));
  const replacement = Fragment.fromArray(nodes), index = $pos.index(-1);
  if (!$pos.node(-1).canReplace(index, index + 1, replacement)) return false;
  if (dispatch) {
    closeHistory(tr); const start = $pos.before();
    tr.replaceWith(start, $pos.after(), replacement);
    tr.setSelection(NodeSelection.create(tr.doc, start + (before.size ? nodes[0]!.nodeSize : 0)));
  }
  return true;
}

/** @returns One guarded transform used by every attachment view and its side-effect-free availability check. */
export function attachmentCommands(): Pick<RawCommands, "setBlockAttachmentView"> {
  return { setBlockAttachmentView: (position, node, view) => context => {
    const { editor, tr, state, dispatch } = context;
    if (!editor.isEditable || !["inline", "card"].includes(view) || !Number.isInteger(position) || position < 0
      || position >= tr.doc.content.size || tr.doc.nodeAt(position) !== node || !["blockAsset", "inlineAttachment"].includes(node.type.name) || node.attrs.kind !== "attachment") return false;
    if (node.isInline) return view === "inline" || expandInline(context, position, node);
    if (view === "card") return true;
    const paragraph = state.schema.nodes.paragraph, inline = state.schema.nodes.inlineAttachment;
    if (!paragraph || !inline) return false;
    const replacement = paragraph.create({ blockId: node.attrs.blockId }, inline.create(node.attrs));
    const $pos = tr.doc.resolve(position), index = $pos.index();
    if (!$pos.parent.canReplace(index, index + 1, Fragment.from(replacement))) return false;
    if (dispatch) { closeHistory(tr); tr.replaceWith(position, position + node.nodeSize, replacement); tr.setSelection(NodeSelection.create(tr.doc, position + 1)); }
    return true;
  } };
}
