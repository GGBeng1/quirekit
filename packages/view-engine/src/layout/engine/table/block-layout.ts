import type { QuireBlockLayoutInput } from "../block-types";
import {
  measureQuireTableCellBlockFlow,
  type QuireTableCellBlockFlowLayout,
  resolveQuireTableGridTracks,
  type QuireTableSourceCell
} from "@quirekit/layout/table";
import { layoutQuireBlockContainer } from "../block";
import type {
  QuireHitTarget,
  QuireLayoutBox,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../types";
import { layoutQuireSinglePageTable } from "./layout";
import type {
  QuireTableBlockInput,
  QuireTableCellContentInput
} from "./types";
import type { QuireTableProductCache } from "../../cache/table";
import { projectQuireTableCellContentLayoutRange } from "../../cache/table/content-projection";

const defaultTableRowHeight = 28;
const defaultTableCellPadding = 4;
const defaultTableBorderWidth = 1;

/**
 * Lays out a provider-owned table contribution at its resolved flow position.
 *
 * @param options - Input node and resolved geometry.
 * @returns Table layout container with cell children and table metadata.
 */
export function layoutQuireTableProviderContribution(options: {
  readonly table: QuireTableBlockInput;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Whether an overwide table shrinks into the width (multi-column flows). */
  readonly fitToWidth?: boolean | undefined;
  readonly blockHeight: number;
  /** Optional retained table products owned by the mounted view. */
  readonly tableProductCache?: QuireTableProductCache | undefined;
  /** Recursive container service supplied by the active layout authority. */
  readonly layoutBlockContainer?: typeof layoutQuireBlockContainer | undefined;
}): QuireLayoutContainer {
  const tableProductCache = options.tableProductCache;
  const contentByCellId = new Map(
    options.table.cellContent.map((content) => [content.semanticCellId, content])
  );
  const cellInlineMetrics = new Map(
    options.table.cellContent.flatMap((content) => content.inlineMetrics === undefined
      ? []
      : [[content.semanticCellId, content.inlineMetrics] as const]
    )
  );

  return layoutQuireSinglePageTable({
    tableId: options.table.source.tableId,
    tableRange: options.table.source.tableRange,
    source: options.table.source,
    constraints: {
      rect: { x: options.x, y: options.y, width: options.width, height: 0 }, defaultRowHeight: defaultTableRowHeight,
      defaultCellPadding: defaultTableCellPadding, defaultBorderWidth: defaultTableBorderWidth, fitToWidth: options.fitToWidth
    },
    cellInlineMetrics,
    measureContent: (cell, contentRect) =>
      measureQuireTableCellContent({
        tableId: options.table.source.tableId, cell, contentRect, contentByCellId, blockHeight: options.blockHeight,
        tableProductCache: options.tableProductCache, layoutBlockContainer: options.layoutBlockContainer
      }),
    inlineMetricsSignature: createCellInlineMetricsSignature(options.table),
    ...(tableProductCache === undefined
      ? {}
      : {
          resolveGridTracks: (request) =>
            tableProductCache.readGridTracks({
              key: {
                tableId: options.table.source.tableId, layoutMode: options.table.source.layoutMode,
                columns: request.columns, x: request.x, availableWidth: request.availableWidth, cellSpacing: request.cellSpacing,
                inlineMetricsSignature: request.inlineMetricsSignature, fitToWidth: request.fitToWidth
              },
              build: () => resolveQuireTableGridTracks(request)
            }),
          resolveBaseRowHeight: (request) =>
            tableProductCache.readRowHeight({
              tableId: options.table.source.tableId,
              rowIndex: request.rowIndex,
              dependencySignature: request.dependencySignature,
              build: request.resolve
            })
        })
  });
}

/**
 * Creates a stable grid dependency from semantic cell intrinsic metrics.
 *
 * @param table - Provider table input containing source-order cell handles.
 * @returns Metric signature, or null outside auto-fit sizing.
 */
function createCellInlineMetricsSignature(table: QuireTableBlockInput): string | null {
  if (table.source.layoutMode !== "auto-fit") {
    return null;
  }
  return table.cellContent.map((content) => [
    content.semanticCellId,
    content.inlineMetrics?.minContentWidth ?? "missing",
    content.inlineMetrics?.maxContentWidth ?? "missing"
  ].join(":")).join("\u0001");
}

/**
 * Collects table hit targets from a layout tree.
 *
 * @param root - Root layout box to inspect.
 * @returns Hit targets emitted by table layout boxes in document order.
 */
export function collectQuireTableHitTargets(
  root: QuireLayoutBox
): QuireLayoutDocument["hitTargets"] {
  const hitTargets: QuireHitTarget[] = [];

  appendQuireTableHitTargets(hitTargets, root);

  return hitTargets;
}

/**
 * Measures recursive block inputs for one table cell.
 *
 * @param options - Cell, content rectangle, content map, and fallback block height.
 * @returns Measured cell content layout for row-height resolution.
 */
function measureQuireTableCellContent(options: {
  readonly tableId: string;
  readonly cell: QuireTableSourceCell;
  readonly contentRect: QuireLayoutBox["rect"];
  readonly contentByCellId: ReadonlyMap<string, QuireTableCellContentInput>;
  readonly blockHeight: number;
  readonly tableProductCache?: QuireTableProductCache | undefined;
  readonly layoutBlockContainer?: typeof layoutQuireBlockContainer | undefined;
}): QuireTableCellBlockFlowLayout<QuireBlockLayoutInput> {
  const content = options.contentByCellId.get(options.cell.id);
  if (
    content?.sourceIdentity !== undefined
    && options.tableProductCache !== undefined
  ) {
    // A shifted cell may collect its current children to prove reuse; a miss
    // then measures those same children instead of collecting them again.
    let collected: readonly QuireBlockLayoutInput[] | undefined;
    const deferred = content.collectChildren;
    const collect = deferred === undefined ? undefined
      : () => collected ??= deferred({ contentRect: options.contentRect });
    return options.tableProductCache.readCellContent({
      key: {
        tableId: options.tableId,
        semanticCellId: options.cell.id,
        sourceIdentity: content.sourceIdentity,
        sourceRange: options.cell.contentRange,
        contentWidth: options.contentRect.width,
        blockHeight: options.blockHeight
      },
      build: () => measureQuireTableCellContentUncached(options, collected === undefined ? content
        : { semanticCellId: content.semanticCellId, children: collected }),
      project: (layout, previousRange, currentRange) =>
        projectQuireTableCellContentLayoutRange(layout, previousRange, currentRange, collect)
    });
  }

  return measureQuireTableCellContentUncached(options, content);
}

/**
 * Measures one semantic cell without consulting retained table products.
 *
 * @param options - Cell geometry and recursive layout services.
 * @param content - Recursive content authority for the semantic cell.
 * @returns Measured cell content and child inputs.
 */
function measureQuireTableCellContentUncached(
  options: Parameters<typeof measureQuireTableCellContent>[0],
  content: QuireTableCellContentInput | undefined
): QuireTableCellBlockFlowLayout<QuireBlockLayoutInput> {
  return measureQuireTableCellBlockFlow({
    cellId: options.cell.id,
    range: options.cell.contentRange,
    contentRect: options.contentRect,
    blockHeight: options.blockHeight,
    content,
    layoutContainer: (request) =>
      (options.layoutBlockContainer ?? layoutQuireBlockContainer)(request)
  });
}

/**
 * Appends table hit targets from one layout box and its descendants.
 *
 * @param hitTargets - Mutable hit-target accumulator.
 * @param box - Layout box to inspect.
 */
function appendQuireTableHitTargets(
  hitTargets: QuireHitTarget[],
  box: QuireLayoutBox
): void {
  if (box.table) {
    hitTargets.push(...box.table.hitTargets);
  }

  if ("children" in box && Array.isArray(box.children)) {
    for (const child of box.children) {
      appendQuireTableHitTargets(hitTargets, child);
    }
  }
}
