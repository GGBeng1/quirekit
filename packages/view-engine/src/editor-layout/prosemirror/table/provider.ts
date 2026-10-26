import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireTableCellBlockFlowCollectionOptions,
  QuireTableSource,
  QuireTableSourceCell
} from "@quirekit/layout/table";
import type {
  QuireTableBlockInput,
  QuireTableCellContentInput
} from "../../../layout/engine/table/types";
import type { QuireTableMapCell, QuireTableModelProfile, QuireTableStyleContext } from "../../../document-profile/types";
import { measureQuireTableCellInlineMetrics } from "./intrinsic-width";
import type { QuireLayoutProviderContext } from "../../../layout/providers";
import type { QuireTableProductCache } from "../../../layout/cache/table";

const intrinsicMeasurementWidth = 1_000_000;

/** Options used to adapt one grid table source node for provider layout. */
export interface CreateQuireWordTableProviderInputOptions {
  /** Authoritative provider context for the table source node. */
  readonly context: QuireLayoutProviderContext;
  /** Stable block id used by table geometry and display products. */
  readonly id: string;
  /** Optional retained table products owned by the mounted view. */
  readonly tableProductCache?: QuireTableProductCache | undefined;
  /** Table model normalizing the source node. */
  readonly tableModel: QuireTableModelProfile;
  /** Document table style context resolved by the table model. */
  readonly styleContext: QuireTableStyleContext;
}

/**
 * Creates model-owned table data for the generic provider host.
 *
 * Grid normalization belongs to the table model while recursive cell content
 * is collected only through framework child-flow services.
 *
 * @param options - Provider context and stable table id.
 * @returns Normalized table source plus recursive cell content handles.
 */
export function createQuireWordTableProviderInput(
  options: CreateQuireWordTableProviderInputOptions
): QuireTableBlockInput {
  const range = options.context.source.range;
  if (range === undefined) {
    throw new RangeError("Word table provider requires an explicit source range.");
  }

  const tableNode = readTableSourceNode(options.context, options.tableModel.tableNodeType);
  const tableMap = options.tableProductCache?.readTableMap({
    sourceIdentity: tableNode,
    build: () => options.tableModel.map(tableNode)
  }) ?? options.tableModel.map(tableNode);
  const sourceRequest = {
    tableId: options.id,
    tableRange: range,
    tableNode,
    map: tableMap,
    styleContext: options.styleContext
  };
  const source = options.tableProductCache?.readSource({
    key: {
      tableId: options.id,
      sourceIdentity: tableNode,
      rangeFrom: range.from,
      rangeTo: range.to,
      styleVariant: options.styleContext.signature ?? "none"
    },
    tableMap,
    build: () => options.tableModel.source(sourceRequest)
  }) ?? options.tableModel.source(sourceRequest);
  const explicitById = new Map(
    tableMap.explicitCells.map((cell) => [cell.id, cell])
  );

  return {
    source,
    cellContent: source.semanticCells.map((cell) =>
      createWordTableCellContentInput(options, tableNode, source, cell, explicitById)
    )
  };
}

/**
 * Creates the recursive child-flow handle for one semantic table cell.
 *
 * @param options - Provider context and stable table id.
 * @param tableNode - Immutable source table owning the cell.
 * @param source - Canonical normalized table source.
 * @param cell - Normalized semantic source cell.
 * @param explicitById - Explicit Word cells keyed by source id.
 * @returns Cell content input with width-aware child collection.
 */
function createWordTableCellContentInput(
  options: CreateQuireWordTableProviderInputOptions,
  tableNode: ProseMirrorNode,
  source: QuireTableSource,
  cell: QuireTableSourceCell,
  explicitById: ReadonlyMap<string, QuireTableMapCell>
): QuireTableCellContentInput {
  const explicitCell = explicitById.get(cell.originExplicitCellId);
  if (explicitCell === undefined) {
    throw new RangeError(`Missing explicit cell: ${cell.originExplicitCellId}`);
  }

  const cellNode = readWordTableCellNode(
    tableNode,
    explicitCell
  );
  const range = options.context.source.range;
  if (range === undefined) {
    throw new RangeError("Word table cell collection requires a source range.");
  }
  const contentStart = range.from + explicitCell.cellPos + 1;
  const path = [
    ...options.context.sourcePath,
    explicitCell.rowIndex,
    explicitCell.cellIndex
  ];

  /**
   * Collects cell children at the resolved content width.
   *
   * @param request - Final cell content geometry.
   * @returns Recursive block inputs in source order.
   */
  const collectChildren = (
    request: QuireTableCellBlockFlowCollectionOptions
  ) => options.context.services.collectBlockInputs({
    sourceIdentity: cellNode,
    contentStart,
    path,
    // Alignment uses the real cell frame even when automatic breaks are disabled.
    inlineSize: Math.max(1, request.contentRect.width),
    lineBreakMode: cell.noWrap === true ? "none" : "word"
  });
  const inlineMetrics = source.layoutMode === "auto-fit"
    ? options.tableProductCache?.readCellInlineMetrics({
        key: {
          tableId: options.id,
          semanticCellId: cell.id,
          sourceIdentity: cellNode
        },
        build: (textMeasurer) => measureQuireTableCellInlineMetrics(
          collectChildren({
            contentRect: { x: 0, y: 0, width: intrinsicMeasurementWidth, height: 0 }
          }),
          textMeasurer
        )
      })
    : undefined;

  return {
    semanticCellId: cell.id,
    sourceIdentity: cellNode,
    ...(inlineMetrics === undefined ? {} : { inlineMetrics }),
    collectChildren
  };
}

/**
 * Reads the table node from the editor-owned source identity.
 *
 * The neutral provider contract deliberately carries only explicit source kind
 * and identity. This adapter is the sole authority that interprets the
 * identity as a ProseMirror node for the built-in grid table provider.
 *
 * @param context - Provider context carrying canonical source metadata.
 * @param tableNodeType - Node type the table model lays out.
 * @returns ProseMirror table node owned by the editor adapter.
 */
function readTableSourceNode(
  context: QuireLayoutProviderContext,
  tableNodeType: string | null
): ProseMirrorNode {
  if (context.sourceKind !== tableNodeType) {
    throw new RangeError(
      `Grid table provider received source kind: ${context.sourceKind}`
    );
  }

  return context.sourceIdentity as ProseMirrorNode;
}

/**
 * Reads the ProseMirror cell node represented by an explicit Word cell ref.
 *
 * @param tableNode - Source Word table node.
 * @param explicitCell - Explicit cell ref to resolve.
 * @returns ProseMirror cell node.
 */
function readWordTableCellNode(
  tableNode: ProseMirrorNode,
  explicitCell: QuireTableMapCell
): ProseMirrorNode {
  const rowNode = tableNode.maybeChild(explicitCell.rowIndex);
  const cellNode = rowNode?.maybeChild(explicitCell.cellIndex);

  if (cellNode == null) {
    throw new RangeError(
      `Missing Word table cell at row ${explicitCell.rowIndex}, cell ${explicitCell.cellIndex}`
    );
  }

  return cellNode;
}
