import { bindBlockNodeLocale, blockEditorText } from "../../localization/node-view";
import type { QuireNodeViewRendererProps } from "@quirekit/core";
import { readDataView } from "@quirekit/data-view";
import { captureDataViewTarget } from "@quirekit/extension-data-view";
import { NodeSelection, Selection, TextSelection } from "@quirekit/pm";
import type { BlockDataViewSnapshot, BlockDataViewSurface } from "./types";

/** Binds one retained object to exact-source document commands.
 * @param props - Live position resolver and canonical document owner.
 * @param changed - Publishes only source or permission changes to the component.
 * @param removed - Detaches the component when this node view ends.
 * @returns Stable opaque node view and controlled component props.
 */
export function createBlockDataViewSurface(
  props: QuireNodeViewRendererProps,
  changed: () => void,
  removed: () => void
): BlockDataViewSurface {
  const { editor } = props;
  const dom = props.view.dom.ownerDocument.createElement("figure");
  dom.contentEditable = "false";
  dom.dataset.qkDataView = "inline"; dom.dataset.qkNotProse = "";
  dom.className = "qk-block-data-view";
  const releaseLocale = bindBlockNodeLocale(editor, () => dom.setAttribute("aria-label", blockEditorText(editor, "多维表格")));
  let source = props.node.attrs.dataView, disposed = false;
  /** @param value - Opaque persistent envelope. @returns Supported source or a lossless presentation fallback. */
  function parse(value: unknown): BlockDataViewSnapshot["value"] {
    try { return readDataView(value); } catch { return null; }
  }
  /** @returns Whether callbacks still belong to an editable mounted object. */
  function writable(): boolean { return !disposed && !editor.isDestroyed && editor.isEditable; }
  /** Hands focus to a widget without retaining the atom-wide document highlight. */
  function enter(): void {
    if (disposed || editor.isDestroyed) return;
    const position = props.getPos(), { doc, selection } = editor.state.pm;
    if (position === undefined || !(selection instanceof NodeSelection) || selection.from !== position) return;
    // Move only the outer object selection. Native field selection and focus
    // remain owned by the component; this creates no document/history edit.
    const nearby = Selection.findFrom(doc.resolve(position + selection.node.nodeSize), 1, true)
      ?? Selection.findFrom(doc.resolve(position), -1, true);
    if (nearby instanceof TextSelection) editor.commands.setTextSelection(nearby.head);
  }
  dom.addEventListener("focusin", enter);
  let current: BlockDataViewSnapshot = {
    value: parse(source), readOnly: !editor.isEditable,
    /** @param save - Complete operation with its exact source precondition. @returns Document acceptance. */
    async commit(save) {
      if (!writable()) return { accepted: false, message: blockEditorText(editor, "此表格已关闭或切换为只读。") };
      // Position is resolved at the action boundary, never captured on mount.
      // The temporary target verifies exact source and releases its mapping listener.
      const position = props.getPos();
      const target = position === undefined ? null : captureDataViewTarget(editor, position);
      if (!target) return { accepted: false, message: blockEditorText(editor, "表格源码已变化，请在当前表格中重新编辑。") };
      try { return await target.commit(save); } finally { target.release(); }
    },
    /** @returns Whether document history accepted undo. */
    undo() { return writable() && editor.commands.undo(); },
    /** @returns Whether document history accepted redo. */
    redo() { return writable() && editor.commands.redo(); }
  };
  return {
    dom,
    /** @returns The same props object until a declared dependency changes. */
    snapshot() { return current; },
    /** @param node - Current canonical atom. @returns Whether this retained view can still represent it. */
    update(node) {
      if (disposed || node.type.name !== "dataView") return false;
      const next = node.attrs.dataView;
      if (next !== source) {
        const value = parse(next);
        if (value?.id !== current.value?.id) return false;
        source = next; current = { ...current, value, readOnly: !editor.isEditable }; changed();
      } else this.syncEditable();
      return true;
    },
    /** Updates permissions without invalidating source-dependent queries. */
    syncEditable() {
      if (disposed || current.readOnly === !editor.isEditable) return;
      current = { ...current, readOnly: !editor.isEditable }; changed();
    },
    /** @param event - Native input or card drag. @returns Inner ownership, leaving only the frame to the document. */
    stopEvent(event) { return !disposed && event.target !== dom && dom.contains(event.target as Node | null); },
    /** @returns Framework DOM is not a document mutation. */
    ignoreMutation() { return true; },
    /** Invalidates action closures before removing their controls. */
    destroy() { if (disposed) return; disposed = true; releaseLocale(); dom.removeEventListener("focusin", enter); removed(); }
  };
}
