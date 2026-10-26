import { getChangedRanges } from "@quirekit/core";
import {
  type Node as ProseMirrorNode,
  type Transaction
} from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireResolvedDocumentProfile, QuireTableMap, QuireTableMapCell, QuireTableModelProfile } from "../document-profile/types";
import { quireNeutralDocumentProfile } from "../document-profile/defaults";
import { deriveQuireFloatingObjectDirtyClassification } from "./floating-object-dirty";
import { createQuireDocumentNodeId } from "./identity";
import {
  deriveQuirePureTextReplaceStepInfo,
  isQuirePureTextReplaceStep,
  readQuireStepJson,
  readQuireStepType,
  readQuireTransactionPreviousDocs
} from "./transaction-steps";
import type {
  QuireFloatingObjectLayoutDirtyTarget,
  QuireInvalidationIdentityGap,
  QuireLayoutDirtyRange,
  QuireLayoutDirtyReason,
  QuireLayoutTextEditHint,
  QuireTableLayoutDirtyReason,
  QuireTableLayoutDirtyTarget
} from "./types";

/** Top-level block located in a post-transform document. */
interface QuireDirtyTopLevelBlock {
  /** Zero-based child index in the document. */
  readonly index: number;
  /** Exact post-transform document range of the block. */
  readonly range: QuireDocumentRange;
  /** Post-transform block node. */
  readonly node: ProseMirrorNode;
}

/** Classified dirty-range metadata before the common range fields are attached. */
interface QuireDirtyClassification {
  /** Canonical layout-affecting cause. */
  readonly reason: QuireLayoutDirtyReason;
  /** Exact table-local target when available. */
  readonly tableTarget?: QuireTableLayoutDirtyTarget | undefined;
  /** Exact floating-object target when available. */
  readonly floatingObjectTarget?: QuireFloatingObjectLayoutDirtyTarget | undefined;
  /** Explicit identity gaps that require conservative invalidation. */
  readonly identityGaps?: readonly QuireInvalidationIdentityGap[] | undefined;
}

/**
 * Derives the first top-level block affected by a document-changing transaction.
 *
 * This is the first, conservative layer of retained layout invalidation: it does
 * not yet decide whether pagination or display chunks can converge, but it gives
 * the later pipeline a stable post-transform block anchor instead of forcing
 * every transaction to start from the document root.
 *
 * @param transaction - ProseMirror transaction to inspect.
 * @param profile - Table and drawing models resolving local identity; the neutral models have neither.
 * @returns Layout dirty range, or null when the transaction does not change the document.
 */
export function deriveQuireLayoutDirtyRangeFromTransaction(
  transaction: Transaction,
  profile: Pick<QuireResolvedDocumentProfile, "tableModel" | "drawingModel"> = quireNeutralDocumentProfile
): QuireLayoutDirtyRange | null {
  if (!transaction.docChanged) {
    return null;
  }

  const changedRange = derivePostTransformChangedRange(transaction);
  const firstBlock = findFirstTopLevelBlockIntersectingRange(
    transaction.doc,
    changedRange
  );

  if (firstBlock === null) {
    return null;
  }

  const textEdit = deriveQuireLayoutTextEditHint(transaction);
  const classification = deriveDirtyClassification([transaction], transaction.doc, firstBlock, changedRange, profile);

  return {
    ...classification,
    changedRange,
    firstTopLevelBlockIndex: firstBlock.index,
    firstTopLevelBlockRange: firstBlock.range,
    ...(textEdit === undefined ? {} : { textEdit })
  };
}

/**
 * Derives a conservative layout dirty range from coalesced transactions.
 *
 * Each transaction reports changed ranges in that transaction's post-transform
 * document. Coalesced renders may contain several such spaces, so earlier
 * changed ranges are mapped through later transaction mappings before being
 * merged in the final document.
 *
 * @param transactions - Applied transactions that contributed to one render.
 * @param profile - Table and drawing models resolving local identity; the neutral models have neither.
 * @returns Layout dirty range, or null when no transaction changed the document.
 */
export function deriveQuireLayoutDirtyRangeFromTransactions(
  transactions: readonly Transaction[] | undefined,
  profile: Pick<QuireResolvedDocumentProfile, "tableModel" | "drawingModel"> = quireNeutralDocumentProfile
): QuireLayoutDirtyRange | null {
  let docChangedCount = 0;
  let onlyDocChangedTransaction: Transaction | undefined;
  let finalDoc: ProseMirrorNode | undefined;

  for (const transaction of transactions ?? []) {
    if (!transaction.docChanged) {
      continue;
    }

    docChangedCount += 1;
    onlyDocChangedTransaction = transaction;
    finalDoc = transaction.doc;
  }

  if (docChangedCount === 0) {
    return null;
  }

  if (docChangedCount === 1 && onlyDocChangedTransaction !== undefined) {
    return deriveQuireLayoutDirtyRangeFromTransaction(onlyDocChangedTransaction, profile);
  }

  const batchEdit = derivePostTransformChangedRangeFromTransactionBatch(
    transactions ?? []
  );
  const changedRange = batchEdit.changedRange;
  const firstBlock =
    finalDoc === undefined
      ? null
      : findFirstTopLevelBlockIntersectingRange(finalDoc, changedRange);

  if (firstBlock === null) {
    return null;
  }

  const classification = deriveDirtyClassification(transactions ?? [], finalDoc!, firstBlock, changedRange, profile);

  return {
    ...classification,
    changedRange,
    firstTopLevelBlockIndex: firstBlock.index,
    firstTopLevelBlockRange: firstBlock.range,
    ...(batchEdit.textEdit === undefined ? {} : { textEdit: batchEdit.textEdit })
  };
}

/**
 * Classifies a document edit and resolves table-local identity when applicable.
 *
 * Table source identity is shared with block layout. Cell identity is accepted
 * only when both changed-range endpoints resolve to the same semantic cell;
 * otherwise the result carries an explicit gap and falls back conservatively.
 *
 * @param transactions - Transactions folded into the dirty range.
 * @param doc - Final post-transform document.
 * @param firstBlock - First affected top-level block.
 * @param changedRange - Final-document changed range.
 * @param profile - Table and drawing models resolving local identity.
 * @returns Canonical dirty classification and optional table target.
 */
function deriveDirtyClassification(
  transactions: readonly Transaction[],
  doc: ProseMirrorNode,
  firstBlock: QuireDirtyTopLevelBlock,
  changedRange: QuireDocumentRange,
  profile: Pick<QuireResolvedDocumentProfile, "tableModel" | "drawingModel">
): QuireDirtyClassification {
  const floatingObjectClassification =
    deriveQuireFloatingObjectDirtyClassification(transactions, profile.drawingModel);
  if (floatingObjectClassification !== undefined) {
    return floatingObjectClassification;
  }

  if (firstBlock.node.type.name !== profile.tableModel.tableNodeType) {
    return {
      reason: transactions.every(isBoundedContentTransaction)
        ? "content"
        : "fallback"
    };
  }

  const tableReason = classifyTableTransactions(transactions, profile.tableModel);
  const tableId = createQuireDocumentNodeId(firstBlock.node, [firstBlock.index]);
  if (tableReason !== "cell-content") {
    return {
      reason: tableReason === "structure" ? "table-structure" : "table-style",
      tableTarget: { tableId, reason: tableReason }
    };
  }

  return resolveTableContentTarget({
    doc,
    tableNode: firstBlock.node,
    tableFrom: firstBlock.range.from,
    tableId,
    changedRange,
    tableModel: profile.tableModel
  });
}

/**
 * Reports whether a transaction can stay within generic content invalidation.
 *
 * @param transaction - Transaction to classify.
 * @returns Whether every changing step is text, mark, or attribute content work.
 */
function isBoundedContentTransaction(transaction: Transaction): boolean {
  const previousDocs = readQuireTransactionPreviousDocs(transaction);

  return transaction.steps.every((step, index) => {
    const type = readQuireStepType(step, readQuireStepJson(step));

    return type === "addMark"
      || type === "removeMark"
      || type === "addNodeMark"
      || type === "removeNodeMark"
      || type === "attr"
      || type === "docAttr"
      || isQuirePureTextReplaceStep(step, previousDocs[index]);
  });
}

/**
 * Classifies table-local transaction work by strongest invalidation category.
 *
 * @param transactions - Transactions folded into one dirty range.
 * @param tableModel - Table model classifying attribute changes.
 * @returns Strongest table-local invalidation reason.
 */
function classifyTableTransactions(
  transactions: readonly Transaction[],
  tableModel: QuireTableModelProfile
): QuireTableLayoutDirtyReason {
  let reason: QuireTableLayoutDirtyReason = "cell-content";

  for (const transaction of transactions) {
    const previousDocs = readQuireTransactionPreviousDocs(transaction);
    for (let index = 0; index < transaction.steps.length; index += 1) {
      const step = transaction.steps[index];
      const json = readQuireStepJson(step);
      const type = readQuireStepType(step, json);

      if (type === "replace" && !isQuirePureTextReplaceStep(step, previousDocs[index])) {
        return "structure";
      }
      if (type === "attr" || type === "docAttr") {
        const impact = typeof json.attr === "string" ? tableModel.attributeImpact(json.attr) : "style";
        if (impact === "structure") return "structure";
        reason = combineTableStyleReason(reason, impact);
      } else if (
        type !== "replace"
        && type !== "addMark"
        && type !== "removeMark"
        && type !== "addNodeMark"
        && type !== "removeNodeMark"
      ) {
        return "structure";
      }
    }
  }

  return reason;
}

/**
 * Preserves broad style invalidation when a batch also contains border work.
 *
 * @param current - Strongest style reason already observed in the batch.
 * @param candidate - Border-only reason from the current attribute step.
 * @returns Broad style when already required, otherwise the border-only reason.
 */
function combineTableStyleReason(
  current: QuireTableLayoutDirtyReason,
  candidate: Exclude<QuireTableLayoutDirtyReason, "cell-content" | "structure">
): QuireTableLayoutDirtyReason {
  if (current === "cell-content" || current === "border-style") {
    return candidate;
  }
  if (candidate === "border-style" || current === candidate) {
    return current;
  }
  return "style";
}

/** Options used to resolve a table-cell dirty target. */
interface ResolveTableContentTargetOptions {
  /** Final post-transform document. */
  readonly doc: ProseMirrorNode;
  /** Final table node. */
  readonly tableNode: ProseMirrorNode;
  /** Table model deriving the grid map. */
  readonly tableModel: QuireTableModelProfile;
  /** Absolute position before the table node. */
  readonly tableFrom: number;
  /** Canonical table block identity. */
  readonly tableId: string;
  /** Final-document changed range. */
  readonly changedRange: QuireDocumentRange;
}

/**
 * Resolves one changed table range to an exact semantic cell.
 *
 * @param options - Final document, table identity, and changed range.
 * @returns Bounded table-content classification or an explicit identity gap.
 */
function resolveTableContentTarget(
  options: ResolveTableContentTargetOptions
): QuireDirtyClassification {
  try {
    const map = options.tableModel.map(options.tableNode);
    const start = resolveExplicitCellAtPosition(options, options.changedRange.from, map);
    const endPosition = options.changedRange.to > options.changedRange.from
      ? options.changedRange.to - 1
      : options.changedRange.from;
    const end = resolveExplicitCellAtPosition(options, endPosition, map);

    if (
      start === undefined
      || end === undefined
      || start.semanticCellId === null
      || end.semanticCellId === null
      || start.semanticCellId !== end.semanticCellId
      || start.rowIndex !== end.rowIndex
    ) {
      return createTableIdentityFallback(
        options.tableId,
        "table-cell-unresolved",
        "Changed table range does not resolve to one semantic cell and source row."
      );
    }

    return {
      reason: "table-content",
      tableTarget: { tableId: options.tableId, semanticCellId: start.semanticCellId, rowIndex: start.rowIndex, reason: "cell-content" }
    };
  } catch {
    return createTableIdentityFallback(options.tableId, "table-map-invalid", "Table map construction failed while resolving dirty identity.");
  }
}

/**
 * Resolves the explicit table cell containing one document position.
 *
 * @param options - Final document and table location.
 * @param position - Final-document position to resolve.
 * @param map - Derived table grid map.
 * @returns Explicit cell ref, or undefined when the position is not in a cell.
 */
function resolveExplicitCellAtPosition(options: ResolveTableContentTargetOptions, position: number, map: QuireTableMap): QuireTableMapCell | undefined {
  const resolved = options.doc.resolve(
    clampDocumentPosition(position, options.doc.content.size)
  );

  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    if (resolved.node(depth).type.name !== options.tableModel.cellNodeType) {
      continue;
    }

    const relativeCellPosition = resolved.before(depth) - options.tableFrom;
    return map.explicitCells.find((cell) => cell.cellPos === relativeCellPosition);
  }

  return undefined;
}

/**
 * Creates a conservative table fallback with a visible identity diagnostic.
 *
 * @param tableId - Canonical table block identity.
 * @param code - Stable identity-gap code.
 * @param message - Diagnostic explanation.
 * @returns Fallback dirty classification.
 */
function createTableIdentityFallback(
  tableId: string,
  code: QuireInvalidationIdentityGap["code"],
  message: string
): QuireDirtyClassification {
  return {
    reason: "fallback",
    tableTarget: { tableId, reason: "cell-content" },
    identityGaps: [{ code, message }]
  };
}

/**
 * Derives precise text-edit metadata for the single-step text case.
 *
 * Multi-step and coalesced transaction batches intentionally do not receive this
 * hint yet: those edits can still use the conservative dirty range while the
 * retained graph learns to merge typed patch metadata safely.
 *
 * @param transaction - Transaction to inspect.
 * @returns Text-edit hint in post-transform document coordinates, or undefined.
 */
function deriveQuireLayoutTextEditHint(
  transaction: Transaction
): QuireLayoutTextEditHint | undefined {
  if (transaction.steps.length !== 1) {
    return undefined;
  }

  const previousDoc = readQuireTransactionPreviousDocs(transaction)[0];
  const stepInfo = deriveQuirePureTextReplaceStepInfo(
    transaction.steps[0],
    previousDoc
  );

  if (stepInfo === undefined) {
    return undefined;
  }

  return {
    from: clampDocumentPosition(
      transaction.mapping.map(stepInfo.from, -1),
      transaction.doc.content.size
    ),
    inserted: stepInfo.inserted,
    deleted: stepInfo.deleted
  };
}

/**
 * Derives one final-document changed range from a batch of transactions.
 *
 * @param transactions - Document-changing transactions in application order.
 * @returns Merged changed range in the final transaction's document.
 */
function derivePostTransformChangedRangeFromTransactionBatch(
  transactions: readonly Transaction[]
): {
  readonly changedRange: QuireDocumentRange;
  readonly textEdit?: QuireLayoutTextEditHint | undefined;
} {
  let changedRange: QuireDocumentRange | undefined;
  let textEdit: QuireLayoutTextEditHint | undefined;
  let textEditMergeable = true;

  for (const transaction of transactions) {
    if (!transaction.docChanged) {
      continue;
    }

    if (changedRange !== undefined) {
      changedRange = mapDocumentRangeThroughMapping(
        changedRange,
        transaction.mapping,
        transaction.doc.content.size
      );
    }

    if (textEdit !== undefined && textEditMergeable) {
      textEdit = mapTextEditHintThroughTransaction(textEdit, transaction);
    }

    const transactionRange = derivePostTransformChangedRange(transaction);
    const transactionTextEdit = deriveQuireLayoutTextEditHint(transaction);

    changedRange =
      changedRange === undefined
        ? transactionRange
        : mergeDocumentRanges([changedRange, transactionRange]);
    if (textEditMergeable) {
      if (textEdit === undefined) {
        textEdit = transactionTextEdit;
        textEditMergeable = transactionTextEdit !== undefined;
      } else {
        textEdit = mergeQuireLayoutTextEditHints(textEdit, transactionTextEdit);
        textEditMergeable = textEdit !== undefined;
      }
    }
  }

  return {
    changedRange: changedRange ?? {
      from: 0,
      to: transactions[transactions.length - 1]?.doc.content.size ?? 0
    },
    ...(textEdit === undefined || !textEditMergeable ? {} : { textEdit })
  };
}

/**
 * Maps a document range through a transaction mapping.
 *
 * @param range - Range in an intermediate document.
 * @param mapping - Mapping from that document to the final document.
 * @param documentSize - Final document content size used for clamping.
 * @returns Range expressed in the final document.
 */
function mapDocumentRangeThroughMapping(
  range: QuireDocumentRange,
  mapping: Transaction["mapping"],
  documentSize: number
): QuireDocumentRange {
  const mappedFrom = mapping.map(range.from, -1);
  const mappedTo = mapping.map(range.to, 1);

  return normalizeDocumentRange({
    from: clampDocumentPosition(mappedFrom, documentSize),
    to: clampDocumentPosition(mappedTo, documentSize)
  });
}

/**
 * Maps a retained text-edit hint through the next transaction in a coalesced batch.
 *
 * @param textEdit - Previously accumulated text edit in the prior transaction's document.
 * @param transaction - Next transaction whose mapping moves the hint into its document.
 * @returns Text edit expressed in the transaction's post-transform document.
 */
function mapTextEditHintThroughTransaction(
  textEdit: QuireLayoutTextEditHint,
  transaction: Transaction
): QuireLayoutTextEditHint {
  return {
    ...textEdit,
    from: clampDocumentPosition(
      transaction.mapping.map(textEdit.from, -1),
      transaction.doc.content.size
    )
  };
}

/**
 * Merges precise text-edit hints for one contiguous input burst.
 *
 * The render scheduler may fold several already-applied transactions into one
 * frame. Keeping a merged pure insert/delete hint lets long-textblock tail reuse
 * avoid rediscovering the same edit by scanning huge strings, while structural
 * or mixed edits still fall back to the conservative dirty range.
 *
 * @param previous - Previously accumulated text edit, already mapped to the current document.
 * @param next - Text edit from the current transaction.
 * @returns Combined edit hint when the two edits are one pure contiguous burst.
 */
function mergeQuireLayoutTextEditHints(
  previous: QuireLayoutTextEditHint | undefined,
  next: QuireLayoutTextEditHint | undefined
): QuireLayoutTextEditHint | undefined {
  if (previous === undefined || next === undefined) {
    return undefined;
  }

  if (isPureInsertTextEdit(previous) && isPureInsertTextEdit(next)) {
    return mergePureInsertTextEditHints(previous, next);
  }

  if (isPureDeleteTextEdit(previous) && isPureDeleteTextEdit(next)) {
    return mergePureDeleteTextEditHints(previous, next);
  }

  return undefined;
}

/**
 * Checks whether a text-edit hint describes insertion only.
 *
 * @param textEdit - Hint to inspect.
 * @returns Whether the hint is a pure insertion.
 */
function isPureInsertTextEdit(textEdit: QuireLayoutTextEditHint): boolean {
  return textEdit.inserted > 0 && textEdit.deleted === 0;
}

/**
 * Checks whether a text-edit hint describes deletion only.
 *
 * @param textEdit - Hint to inspect.
 * @returns Whether the hint is a pure deletion.
 */
function isPureDeleteTextEdit(textEdit: QuireLayoutTextEditHint): boolean {
  return textEdit.inserted === 0 && textEdit.deleted > 0;
}

/**
 * Merges adjacent insertions from a repeat-key burst.
 *
 * @param previous - Accumulated pure insertion.
 * @param next - Next pure insertion in final-document coordinates.
 * @returns Combined insertion, or undefined when the edit is not contiguous.
 */
function mergePureInsertTextEditHints(
  previous: QuireLayoutTextEditHint,
  next: QuireLayoutTextEditHint
): QuireLayoutTextEditHint | undefined {
  const previousTo = previous.from + previous.inserted;

  if (next.from === previousTo) {
    return {
      from: previous.from,
      inserted: previous.inserted + next.inserted,
      deleted: 0
    };
  }

  if (next.from === previous.from) {
    return {
      from: next.from,
      inserted: previous.inserted + next.inserted,
      deleted: 0
    };
  }

  return undefined;
}

/**
 * Merges repeated deletions that collapse to one final-document cursor.
 *
 * @param previous - Accumulated pure deletion.
 * @param next - Next pure deletion in final-document coordinates.
 * @returns Combined deletion, or undefined when the edit is not contiguous.
 */
function mergePureDeleteTextEditHints(
  previous: QuireLayoutTextEditHint,
  next: QuireLayoutTextEditHint
): QuireLayoutTextEditHint | undefined {
  if (next.from !== previous.from) {
    return undefined;
  }

  return {
    from: previous.from,
    inserted: 0,
    deleted: previous.deleted + next.deleted
  };
}

/**
 * Merges document ranges into one bounding range.
 *
 * @param ranges - Ranges to merge.
 * @returns Bounding range containing every input range.
 */
function mergeDocumentRanges(
  ranges: readonly QuireDocumentRange[]
): QuireDocumentRange {
  return ranges.reduce<QuireDocumentRange>(
    (merged, range) => ({
      from: Math.min(merged.from, range.from),
      to: Math.max(merged.to, range.to)
    }),
    ranges[0]!
  );
}

/**
 * Orders a document range after mapping.
 *
 * @param range - Possibly reversed range.
 * @returns Range with `from <= to`.
 */
function normalizeDocumentRange(range: QuireDocumentRange): QuireDocumentRange {
  if (range.from <= range.to) {
    return range;
  }

  return { from: range.to, to: range.from };
}

/**
 * Clamps a document position to the final document content bounds.
 *
 * @param position - Position to clamp.
 * @param documentSize - Final document content size.
 * @returns Clamped position.
 */
function clampDocumentPosition(position: number, documentSize: number): number {
  return Math.max(0, Math.min(position, documentSize));
}

/**
 * Derives a single post-transform changed range from a transaction mapping.
 *
 * @param transaction - Transaction whose changed ranges should be merged.
 * @returns Merged changed range in the transaction's final document.
 */
function derivePostTransformChangedRange(
  transaction: Transaction
): QuireDocumentRange {
  const changes = getChangedRanges(transaction);

  if (changes.length === 0) {
    return { from: 0, to: transaction.doc.content.size };
  }

  return changes.reduce<QuireDocumentRange>(
    (merged, change) => ({
      from: Math.min(merged.from, change.newRange.from),
      to: Math.max(merged.to, change.newRange.to)
    }),
    {
      from: changes[0]!.newRange.from,
      to: changes[0]!.newRange.to
    }
  );
}

/**
 * Finds the first top-level block intersecting or containing a dirty range.
 *
 * @param doc - Post-transform ProseMirror document.
 * @param range - Post-transform changed range.
 * @returns First affected top-level block summary, or null when none exists.
 */
function findFirstTopLevelBlockIntersectingRange(
  doc: ProseMirrorNode,
  range: QuireDocumentRange
): QuireDirtyTopLevelBlock | null {
  let result: QuireDirtyTopLevelBlock | null = null;

  doc.forEach((child, offset, index) => {
    if (result !== null || !child.isBlock) {
      return;
    }

    const blockRange = { from: offset, to: offset + child.nodeSize };

    if (documentRangesIntersectOrContainPoint(range, blockRange)) {
      result = { index, range: blockRange, node: child };
    }
  });

  return result;
}

/**
 * Reports whether a dirty range intersects a block range.
 *
 * Empty changed ranges represent insert/delete cursors, so containment of the
 * single point is enough. Non-empty ranges use half-open intersection semantics
 * that match ProseMirror document positions.
 *
 * @param dirtyRange - Changed range to test.
 * @param blockRange - Top-level block range to test.
 * @returns Whether the block is affected.
 */
function documentRangesIntersectOrContainPoint(
  dirtyRange: QuireDocumentRange,
  blockRange: QuireDocumentRange
): boolean {
  if (dirtyRange.from === dirtyRange.to) {
    return dirtyRange.from >= blockRange.from && dirtyRange.from <= blockRange.to;
  }

  return dirtyRange.from < blockRange.to && dirtyRange.to > blockRange.from;
}
