import {
  Plugin,
  type EditorView,
  type Node as PMNode
} from "@quirekit/pm";
import type { Editor } from "@quirekit/core";
import { createWordTableMap } from "../map";

/**
 * Creates the Word Table triple-click interaction plugin.
 *
 * @param editor - Editor whose command surface owns selection changes.
 * @returns Plugin that upgrades a cell triple click to structural selection.
 */
export function createWordTableTripleClickPlugin(editor: Editor): Plugin {
  return new Plugin({
    props: {
      handleTripleClickOn(
        view: EditorView,
        _pos: number,
        node: PMNode,
        nodePos: number
      ) {
        return selectWordTableCellFromTripleClick(editor, view, node, nodePos);
      }
    }
  });
}

/**
 * Selects the semantic cell addressed by one triple-click callback.
 *
 * This handler intentionally waits for the cell ancestor callback rather than
 * handling an inner paragraph/text node. Other triple clicks therefore retain
 * normal ProseMirror text-block behavior.
 *
 * @param editor - Editor whose command surface owns selection changes.
 * @param view - Editable ProseMirror-compatible mounted View.
 * @param node - Context node supplied by `handleTripleClickOn`.
 * @param nodePos - Absolute position before the context node.
 * @returns Whether one structural cell selection was dispatched.
 */
export function selectWordTableCellFromTripleClick(
  editor: Editor,
  view: EditorView,
  node: PMNode,
  nodePos: number
): boolean {
  if (
    !view.editable
    || (
      node.type.name !== "wordTableCell"
      && node.type.spec.tableRole !== "cell"
    )
    || nodePos < 0
    || nodePos + 1 > view.state.doc.content.size
  ) {
    return false;
  }

  const $insideCell = view.state.doc.resolve(nodePos + 1);
  let tableDepth = -1;

  for (let depth = $insideCell.depth; depth >= 0; depth -= 1) {
    const ancestor = $insideCell.node(depth);
    if (
      ancestor.type.name === "wordTable"
      || ancestor.type.spec.tableRole === "table"
    ) {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth < 0) return false;
  const tableNode = $insideCell.node(tableDepth);
  const tablePos = $insideCell.before(tableDepth);
  const semanticCell = createWordTableMap(tableNode).findSemanticCell(
    nodePos - tablePos
  );

  if (!semanticCell) return false;
  return editor.commands.setWordTableSelection({
    tablePos,
    anchorCellPos: semanticCell.originCellPos,
    headCellPos: semanticCell.originCellPos,
    mode: "cell"
  });
}
