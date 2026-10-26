import {
  NodeSelection,
  Selection,
  TextSelection,
  type Node as ProseMirrorNode
} from "@quirekit/pm";
import { quireNeutralDocumentProfile } from "../../document-profile/defaults";
import {
  resolveQuireTextblockSelectionRange,
  resolveQuireWordSelectionRange
} from "../range";
import { createQuireSelectionGeometryContextFromHitTestResult } from "./context";
import {
  resolveQuireStructuredRangeSelectionSemantics
} from "./structured-range/semantics";
import type {
  QuireTableCellSelectionHit
} from "../types";
import type {
  QuireSelectionSemanticsResult,
  QuirePointerHitSelectionSemanticsOptions,
  QuireTextAnchorSelectionSemanticsOptions,
  QuireTextCaretSelectionSemanticsOptions,
  QuireTextExpandedSelectionSemanticsOptions,
  QuireTextRangeSelectionSemanticsOptions
} from "./types";

/**
 * Resolves one pointer hit through the retained interaction domain that owns it.
 *
 * @param options - Document, pointer hit, and retained interaction target.
 * @returns Domain-owned selection result, or null when exact authority is invalid.
 */
export function resolveQuirePointerHitSelectionSemantics(
  options: QuirePointerHitSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  const interactionTarget = options.interactionTarget;

  if (
    interactionTarget?.domain === "object" ||
    interactionTarget?.domain === "node"
  ) {
    return resolveExactNodeSelectionSemantics(options);
  }

  if (interactionTarget?.domain === "control") {
    return null;
  }

  return resolveQuireTextCaretSelectionSemantics(options);
}

/**
 * Resolves text caret selection semantics from a pointer hit.
 *
 * @param options - ProseMirror document and interaction geometry hit result.
 * @returns Text-domain selection result, or null when the hit cannot select text.
 */
export function resolveQuireTextCaretSelectionSemantics(
  options: QuireTextCaretSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  if (options.hitTestResult.kind === "miss") {
    return null;
  }

  return {
    domain: "text",
    selection: Selection.near(
      options.doc.resolve(options.hitTestResult.position.pos),
      options.hitTestResult.position.bias ?? 1
    )
  };
}

/**
 * Resolves text range semantics from an existing selection anchor to a pointer hit.
 *
 * @param options - ProseMirror document, anchor, pointer hit, and optional PM hook.
 * @returns Text-domain selection result, or null when the hit cannot select text.
 */
export function resolveQuireTextAnchorSelectionSemantics(
  options: QuireTextAnchorSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  if (options.hitTestResult.kind === "miss") {
    return null;
  }

  return resolveTextRangeSelection({
    doc: options.doc,
    anchorHitTestResult: {
      kind: "position",
      position: { pos: options.anchor, bias: 0 },
      inside: options.anchor,
      rect: options.hitTestResult.rect
    },
    headHitTestResult: options.hitTestResult,
    createSelectionBetween: options.createSelectionBetween
  });
}

/**
 * Resolves text range semantics from anchor and head pointer hits.
 *
 * @param options - ProseMirror document, anchor/head hits, and optional PM hook.
 * @returns Text-domain selection result, or null when either hit cannot select text.
 */
export function resolveQuireTextRangeSelectionSemantics(
  options: QuireTextRangeSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  return resolveTextRangeSelection(options);
}

/**
 * Resolves expanded text selection semantics for word and textblock gestures.
 *
 * @param options - ProseMirror document, layout snapshot, pointer hit, and gesture kind.
 * @returns Text-domain selection result, or null when the range cannot be resolved.
 */
export function resolveQuireTextExpandedSelectionSemantics(
  options: QuireTextExpandedSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  if (options.hitTestResult.kind === "miss") {
    return null;
  }

  const selectionContext = createQuireSelectionGeometryContextFromHitTestResult(
    options.hitTestResult
  );
  const range = options.kind === "word"
    ? resolveQuireWordSelectionRange({
        snapshot: options.snapshot,
        position: options.hitTestResult.position,
        ...(selectionContext === undefined ? {} : { selectionContext })
      })
    : resolveQuireTextblockSelectionRange({
        doc: options.doc,
        position: options.hitTestResult.position
      });

  if (!range) {
    return null;
  }

  return {
    domain: "text",
    selection: TextSelection.between(
      options.doc.resolve(range.from),
      options.doc.resolve(range.to),
      options.hitTestResult.position.bias ?? 1
    )
  };
}

/**
 * Resolves a text range selection from two position hits.
 *
 * @param options - ProseMirror document, anchor/head hits, and optional PM hook.
 * @returns Text-domain selection result, or null when either hit is a miss.
 */
function resolveTextRangeSelection(
  options: QuireTextRangeSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  if (
    options.anchorHitTestResult.kind === "miss" ||
    options.headHitTestResult.kind === "miss"
  ) {
    return null;
  }

  const structuredSelection =
    resolveQuireStructuredRangeSelectionSemantics(options);
  if (structuredSelection !== null) {
    return structuredSelection;
  }

  const tableSelection = resolveTableCellRangeSelection(options);
  if (tableSelection !== null) {
    return tableSelection;
  }

  const $anchor = options.doc.resolve(options.anchorHitTestResult.position.pos);
  const $head = options.doc.resolve(options.headHitTestResult.position.pos);

  return {
    domain: "text",
    selection:
      options.createSelectionBetween?.($anchor, $head) ??
      TextSelection.between(
        $anchor,
        $head,
        options.headHitTestResult.position.bias ?? 1
      )
  };
}

/**
 * Promotes complete cell coverage or a cross-cell drag to Word table selection.
 *
 * Partial same-cell ranges deliberately return null so ordinary text selection
 * continues to own cell content. Complete same-cell coverage promotes to one
 * structural cell, while different semantic cells retain the existing range
 * behavior. Repeated header fragments use the same semantic id and therefore
 * cannot manufacture duplicate selections.
 *
 * @param options - Document and retained anchor/head position hits.
 * @returns Structural cell-domain selection, or null for text-range semantics.
 */
function resolveTableCellRangeSelection(
  options: QuireTextRangeSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  const tableModel = options.tableModel ?? quireNeutralDocumentProfile.tableModel;
  if (
    options.anchorHitTestResult.kind === "miss" ||
    options.headHitTestResult.kind === "miss"
  ) {
    return null;
  }

  const anchorCell = options.anchorHitTestResult.tableCell;
  const headCell = options.headHitTestResult.tableCell;
  if (
    anchorCell === undefined ||
    headCell === undefined ||
    anchorCell.tableId !== headCell.tableId ||
    anchorCell.tablePos !== headCell.tablePos
  ) {
    return null;
  }

  const isSameSemanticCell =
    anchorCell.semanticCellId === headCell.semanticCellId;
  if (isSameSemanticCell) {
    if (anchorCell.originCellPos !== headCell.originCellPos) {
      return null;
    }

    const selectableRange = resolveTableCellSelectableContentRange(options.doc, anchorCell, tableModel.cellNodeType);
    if (
      selectableRange === null ||
      Math.min(
        options.anchorHitTestResult.position.pos,
        options.headHitTestResult.position.pos
      ) > selectableRange.from ||
      Math.max(
        options.anchorHitTestResult.position.pos,
        options.headHitTestResult.position.pos
      ) < selectableRange.to
    ) {
      return null;
    }
  }

  try {
    return {
      domain: "cell",
      selection: tableModel.createCellSelection(options.doc, {
        tablePos: anchorCell.tablePos,
        anchorCellPos: anchorCell.originCellPos,
        headCellPos: isSameSemanticCell
          ? anchorCell.originCellPos
          : headCell.originCellPos
      })
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the complete selectable PM interval inside one retained Table cell.
 *
 * The current document is authoritative. Retained source coordinates are used
 * only after its absolute origin still resolves a Word Table cell, which
 * prevents stale layout from upgrading an unrelated text range. Textblock
 * boundaries include inline atoms and the block gaps between the first and
 * last textblock.
 *
 * @param doc - Current ProseMirror document.
 * @param cell - Retained semantic cell facts from the pointer hit.
 * @param cellNodeType - Cell node type of the table model.
 * @returns Non-empty selectable content interval, or null when it is empty or stale.
 */
function resolveTableCellSelectableContentRange(
  doc: ProseMirrorNode,
  cell: QuireTableCellSelectionHit,
  cellNodeType: string | null
): { readonly from: number; readonly to: number } | null {
  const cellPosition = cell.tablePos + cell.originCellPos;
  const cellNode = doc.nodeAt(cellPosition);
  if (
    cellNode === null ||
    cellNode.type.name !== cellNodeType ||
    cell.range.from !== cellPosition
  ) {
    return null;
  }

  let from: number | undefined;
  let to: number | undefined;
  cellNode.descendants((node, relativePosition) => {
    if (!node.isTextblock) {
      return true;
    }

    const contentStart = cellPosition + relativePosition + 2;
    from ??= contentStart;
    to = contentStart + node.content.size;
    return false;
  });

  return from !== undefined && to !== undefined && to > from
    ? { from, to }
    : null;
}

/**
 * Resolves object and node domains only when their retained source still names
 * the exact selectable document node. This prevents stale visual instances
 * from silently selecting nearby text after a document transaction.
 *
 * @param options - Document, pointer hit, and retained node interaction target.
 * @returns Exact node selection, or null when source authority is stale.
 */
function resolveExactNodeSelectionSemantics(
  options: QuirePointerHitSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  const interactionTarget = options.interactionTarget;
  const sourceRange = interactionTarget?.source?.range;

  if (
    interactionTarget === null ||
    sourceRange === undefined ||
    interactionTarget.capabilities?.selectable !== true
  ) {
    return null;
  }

  const node = options.doc.nodeAt(sourceRange.from);
  if (
    node === null ||
    sourceRange.to !== sourceRange.from + node.nodeSize ||
    !NodeSelection.isSelectable(node)
  ) {
    return null;
  }

  return {
    domain: interactionTarget.domain,
    selection: NodeSelection.create(options.doc, sourceRange.from)
  };
}
