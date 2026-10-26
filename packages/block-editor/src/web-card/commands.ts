import type { CommandProps, RawCommands } from "@quirekit/core";
import { closeHistory, Fragment, NodeSelection, TextSelection, type Node as PMNode } from "@quirekit/pm";
import { isBlockLinkCurrent } from "../links/commands";
import type { BlockLinkTarget } from "../links/types";
import { inlineWebMetadata, readWebMetadata, webLinkTitle } from "./metadata";
import type { BlockWebLinkView, BlockWebLinkMetadata } from "./types";

declare module "@quirekit/core" {
  /** Block product presentation transforms; generic Link remains renderer-neutral. */
  interface Commands<ReturnType> {
    /** Same-resource presentation changes, each independently undoable. */
    readonly blockWebLink: {
      /** @param target - Exact inline occurrence. @param view - Desired presentation. @returns Whether the target accepts conversion. */
      readonly setBlockLinkView: (target: BlockLinkTarget, view: BlockWebLinkView) => ReturnType;
      /** @param position - Block boundary. @param node - Expected immutable source. @param view - Desired presentation. @returns Whether the target accepts conversion. */
      readonly setBlockWebCardView: (position: number, node: PMNode, view: BlockWebLinkView) => ReturnType;
      /** @param position - Block boundary. @param node - Expected immutable source. @param height - CSS pixel height. @returns Whether the resize was accepted. */
      readonly resizeBlockWebCard: (position: number, node: PMNode, height: number) => ReturnType;
    };
  }
}

/** @param view - Requested view. @returns Whether it is a declared view. */
function validView(view: string): view is BlockWebLinkView { return ["link", "title", "card", "preview"].includes(view); }

/**
 * Replaces only the containing paragraph, preserving its before/after fragments.
 * @param context - Canonical command state.
 * @param target - Captured link.
 * @param metadata - Destination metadata.
 * @param view - Rich presentation.
 * @returns Whether the parent can represent the exact replacement.
 */
function toBlock(context: CommandProps, target: BlockLinkTarget, metadata: BlockWebLinkMetadata, view: BlockWebLinkView): boolean {
  const { tr, state, dispatch } = context, range = target.range!;
  const $from = tr.doc.resolve(range.from), $to = tr.doc.resolve(range.to), type = state.schema.nodes.webCard;
  if (!type || !$from.sameParent($to) || $from.depth < 1) return false;
  const parent = $from.parent, before = parent.content.cut(0, $from.parentOffset), after = parent.content.cut($to.parentOffset);
  const card = type.create({ ...metadata, mode: view === "preview" ? "embed" : "card", blockId: before.size ? null : parent.attrs.blockId });
  const nodes: PMNode[] = [];
  if (before.size) nodes.push(parent.copy(before));
  nodes.push(card);
  if (after.size) nodes.push(parent.type.create({ ...parent.attrs, blockId: null }, after, parent.marks));
  const outer = $from.node(-1), index = $from.index(-1), replacement = Fragment.fromArray(nodes);
  if (!outer.canReplace(index, index + 1, replacement)) return false;
  if (dispatch) {
    closeHistory(tr);
    const start = $from.before();
    tr.replaceWith(start, $from.after(), replacement);
    tr.setSelection(NodeSelection.create(tr.doc, start + (before.size ? nodes[0]!.nodeSize : 0)));
  }
  return true;
}

/** @returns Guarded transforms using the public command transaction, including side-effect-free can(). */
export function webLinkCommands(): Pick<RawCommands, "setBlockLinkView" | "setBlockWebCardView" | "resizeBlockWebCard"> {
  return {
    setBlockLinkView: (target, view) => context => {
      const { editor, tr, state, dispatch } = context;
      if (!validView(view) || !target?.range || !target.textEditable || !editor.isEditable || !isBlockLinkCurrent(editor, target) || tr.doc !== target.doc) return false;
      const metadata = inlineWebMetadata(target), type = state.schema.marks.link;
      if (!metadata || !type) return false;
      if (view === "card" || view === "preview") return toBlock(context, target, metadata, view);
      const label = view === "link" ? metadata.url : webLinkTitle(metadata), { from, to } = target.range;
      if (dispatch) {
        closeHistory(tr);
        const mark = type.create({ href: metadata.url, web: metadata });
        if (label === target.text) tr.addMark(from, to, mark);
        else tr.replaceWith(from, to, state.schema.text(label, mark.addToSet(type.removeFromSet(tr.doc.nodeAt(from)?.marks ?? []))));
        tr.setSelection(TextSelection.create(tr.doc, from, from + label.length));
      }
      return true;
    },
    setBlockWebCardView: (position, node, view) => ({ editor, tr, state, dispatch }) => {
      if (!validView(view) || !editor.isEditable || !Number.isInteger(position) || position < 0 || position >= tr.doc.content.size || tr.doc.nodeAt(position) !== node || node.type.name !== "webCard") return false;
      const metadata = readWebMetadata(node.attrs);
      if (!metadata) return false;
      if (view === "card" || view === "preview") {
        if (dispatch) { closeHistory(tr); tr.setNodeMarkup(position, undefined, { ...node.attrs, mode: view === "preview" ? "embed" : "card" }); tr.setSelection(NodeSelection.create(tr.doc, position)); }
        return true;
      }
      const type = state.schema.nodes.paragraph, link = state.schema.marks.link;
      if (!type || !link) return false;
      const text = view === "link" ? metadata.url : webLinkTitle(metadata);
      const paragraph = type.create({ blockId: node.attrs.blockId }, state.schema.text(text, [link.create({ href: metadata.url, web: metadata })]));
      const $pos = tr.doc.resolve(position);
      if (!$pos.parent.canReplace($pos.index(), $pos.index() + 1, Fragment.from(paragraph))) return false;
      if (dispatch) { closeHistory(tr); tr.replaceWith(position, position + node.nodeSize, paragraph); tr.setSelection(TextSelection.create(tr.doc, position + 1, position + 1 + text.length)); }
      return true;
    },
    resizeBlockWebCard: (position, node, height) => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !Number.isInteger(position) || position < 0 || position >= tr.doc.content.size || tr.doc.nodeAt(position) !== node || node.type.name !== "webCard" || !Number.isFinite(height) || height < 160 || height > 800) return false;
      if (dispatch) { closeHistory(tr); tr.setNodeMarkup(position, undefined, { ...node.attrs, height: Math.round(height) }); }
      return true;
    }
  };
}
