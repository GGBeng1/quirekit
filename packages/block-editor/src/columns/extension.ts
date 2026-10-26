import { BlockSelection, Node, selectionPreset, type RawCommands } from "@quirekit/core";
import { Fragment, closeHistory, TextSelection } from "@quirekit/pm";
import { renderRichContent } from "../rich-content/surface";
import { validColumnWidths } from "./model";
import { columnsMenu } from "./menu";
declare module "@quirekit/core" {
  /** Continuous-flow layout commands. */
  interface Commands<ReturnType> {
    /** These wrappers carry editable blocks, never paginated sections. */
    readonly blockColumns: {
      /** @param position - Group boundary. @param widths - New column count and ratios. @returns Acceptance. */
      readonly setBlockColumns: (position: number, widths: readonly number[]) => ReturnType;
      /** @param position - Group boundary. @returns Whether every child was retained in reading order. */
      readonly unwrapBlockColumns: (position: number) => ReturnType;
      /** @param position - Child block boundary. @param direction - Adjacent column. @returns Whether the block moved. */
      readonly moveBlockToColumn: (position: number, direction: -1 | 1) => ReturnType;
    };
  }
}
/** One semantic column keeps its own editable children. */
export const BlockColumn = Node.create({
  name: "blockColumn", content: "block+", defining: true, isolating: true,
  /** @returns Explicit column markup only. */ parseHTML() { return [{ tag: "div[data-qk-column]" }]; },
  /** @returns Portable readable HTML. */ renderHTML() { return ["div", { "data-qk-column": "", style: "min-width:0" }, 0]; }
});
/** A responsive group of editable columns in document order. */
export const BlockColumns = Node.create({
  name: "blockColumns", group: "block", content: "blockColumn{2,4}", defining: true, isolating: true,
  /** @returns Whole-wrapper selection with editable descendants. */
  addSelection() { return [selectionPreset.container({ id: "block-columns", nodeTypes: [this.name] })]; },
  /** @returns Canonical relative widths. */
  addAttributes() { return { widths: { default: [50, 50], rendered: false,
    /** @param value - Persisted ratios. */ validate(value: unknown) { if (!validColumnWidths(value)) throw new RangeError("Invalid column widths"); }
  } }; },
  /** @returns Own markup with validated ratios. */
  parseHTML() { return [{ tag: "div[data-qk-columns]", getAttrs: element => {
    try { const widths = JSON.parse(element.getAttribute("data-qk-columns") ?? "[]"); return validColumnWidths(widths) ? { widths } : false; } catch { return false; }
  } }]; },
  /** @param context - Current layout. @returns Exported layout retaining all child content. */
  renderHTML({ node }) { return ["div", { "data-qk-columns": JSON.stringify(node.attrs.widths),
    style: `display:grid;gap:24px;grid-template-columns:${Array.from({length:node.childCount},(_,i)=>`minmax(0,${node.attrs.widths[i] ?? 1}fr)`).join(" ")}` }, 0]; },
  /** @returns Provider-preserving layout controls. */ addNodeView() { return renderRichContent; },
  /** @returns Layout and cross-column actions for the shared block menu. */ addBlockMenuProviders() { return [columnsMenu]; },
  /** @returns Content-preserving structural operations. */
  addCommands(): Partial<RawCommands> { return {
    setBlockColumns: (position, widths) => ({ editor, tr, dispatch }) => {
      const node = Number.isInteger(position) && position >= 0 && position < tr.doc.content.size ? tr.doc.nodeAt(position) : null;
      if (!editor.isEditable || node?.type.name !== "blockColumns" || !validColumnWidths(widths)) return false;
      if (widths.length === node.childCount) {
        // A width adjustment leaves every descendant and its text selection in place.
        if (dispatch) closeHistory(tr).setNodeMarkup(position, undefined, { ...node.attrs, widths: [...widths] });
        return true;
      }
      const columns = Array.from({ length: widths.length }, (_, index) => node.maybeChild(index) ?? editor.state.schema.nodes.blockColumn!.createAndFill()!);
      // Shrinking never discards content: remaining columns join the final retained column.
      for (let index = widths.length; index < node.childCount; index++) columns[columns.length - 1] = columns.at(-1)!.copy(columns.at(-1)!.content.append(node.child(index).content));
      if (dispatch) closeHistory(tr).replaceWith(position, position + node.nodeSize, node.type.create({ ...node.attrs, widths: [...widths] }, columns));
      return true;
    },
    unwrapBlockColumns: position => ({ editor, tr, dispatch }) => {
      const node = Number.isInteger(position) && position >= 0 && position < tr.doc.content.size ? tr.doc.nodeAt(position) : null;
      if (!editor.isEditable || node?.type.name !== "blockColumns") return false;
      let content = Fragment.empty; node.forEach(column => { content = content.append(column.content); });
      const $pos = tr.doc.resolve(position);
      if (!$pos.parent.canReplace($pos.index(), $pos.index() + 1, content)) return false;
      if (dispatch) { closeHistory(tr).replaceWith(position, position + node.nodeSize, content); tr.setSelection(TextSelection.near(tr.doc.resolve(position))); }
      return true;
    },
    moveBlockToColumn: (position, direction) => ({ editor, tr, dispatch }) => {
      if (!editor.isEditable || !Number.isInteger(position) || position < 0 || position >= tr.doc.content.size || ![-1,1].includes(direction)) return false;
      const $pos = tr.doc.resolve(position), node = tr.doc.nodeAt(position);
      if (!node || $pos.parent.type.name !== "blockColumn" || $pos.depth < 2) return false;
      const group = $pos.node($pos.depth - 1), index = $pos.index($pos.depth - 1), destination = index + direction;
      if (group.type.name !== "blockColumns" || destination < 0 || destination >= group.childCount) return false;
      const columns = Array.from({length: group.childCount}, (_, i) => group.child(i));
      const kept = columns[index]!.content.cut(0, $pos.parentOffset).append(columns[index]!.content.cut($pos.parentOffset + node.nodeSize));
      columns[index] = columns[index]!.copy(kept.size ? kept : Fragment.from(editor.state.schema.nodes.paragraph!.create()));
      const target = columns[destination]!, empty = target.childCount === 1 && target.firstChild?.type.name === "paragraph" && !target.firstChild.content.size;
      columns[destination] = target.copy(empty ? Fragment.from(node) : target.content.append(Fragment.from(node)));
      if (dispatch) {
        const groupFrom = $pos.before($pos.depth - 1);
        closeHistory(tr).replaceWith(groupFrom, $pos.after($pos.depth - 1), group.copy(Fragment.fromArray(columns)));
        const movedFrom = groupFrom + 2 + columns.slice(0, destination).reduce((sum, column) => sum + column.nodeSize, 0) + (empty ? 0 : target.content.size);
        const selection = BlockSelection.create(tr.doc, movedFrom, movedFrom + node.nodeSize);
        if (selection) tr.setSelection(selection).scrollIntoView();
      }
      return true;
    }
  }; }
});
