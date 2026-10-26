import type { QuireSubLayoutProjection } from "../../sub-layout";
import type { QuireLayoutBox } from "../../types";
import {
  createQuireTableCellSliceIdentity
} from "./identity";
import { createQuireTableCellLayoutBoxLookup } from "./source-box";
import type {
  CreateQuireTableCellSubLayoutRootMapOptions,
  CreateQuireTableCellSubLayoutRootOptions,
  QuireTableCellSubLayoutRootMapDependencySignatureRequest,
  QuireTableCellSubLayoutRootMap,
  QuireTableCellSubLayoutRoot
} from "./types";

/**
 * Creates the first generic sub-layout root adapter for table-cell child flow.
 *
 * @param options - Table cell, measured child flow, and adapter identity inputs.
 * @returns Generic sub-layout root representing the table-cell child flow.
 */
export function createQuireTableCellSubLayoutRoot(
  options: CreateQuireTableCellSubLayoutRootOptions
): QuireTableCellSubLayoutRoot {
  const identity = createQuireTableCellSliceIdentity(options.cell);

  return {
    geometry: {
      id: options.retainedRoot.geometry.id,
      kind: "table-cell",
      range: options.cell.range,
      placement: {
        parentId: options.parentId,
        rect: options.cell.rect,
        contentRect: options.cell.contentRect,
        ...(options.cell.contentLayoutRect === undefined
          ? {}
          : { clipRect: options.cell.contentLayoutRect })
      },
      localRect: options.localRect
        ?? options.childFlowBox.inlineLayoutRect
        ?? options.childFlowBox.rect,
      writingMode: "horizontal-tb",
      dependencySignature: options.dependencySignature,
      metadata: {
        ...options.retainedRoot.geometry.metadata,
        tableCell: identity
      }
    },
    view: {
      ownership: options.retainedRoot.view.ownership,
      sourceBox: options.childFlowBox
    }
  };
}

/**
 * Creates sub-layout roots for table-cell child flows keyed by cell fragment id.
 *
 * @param options - Table cells, child flow boxes, and parent identity.
 * @returns Sub-layout roots keyed by the table-cell fragment id that owns them.
 */
export function createQuireTableCellSubLayoutRootMap(
  options: CreateQuireTableCellSubLayoutRootMapOptions
): QuireTableCellSubLayoutRootMap {
  const childFlowByCellId = createQuireTableCellChildFlowLookup(options.children);
  const rootByCellId = new Map<string, QuireTableCellSubLayoutRoot>();

  for (const cell of options.cells) {
    const sourceCellId = options.resolveSourceCellId?.(cell) ?? cell.id;
    const childFlowBox = childFlowByCellId.get(sourceCellId);

    if (childFlowBox === undefined) {
      continue;
    }

    const signatureRequest = {
      cell,
      sourceCellId,
      childFlowBox,
      parentId: options.parentId,
      ...(options.dependencySignaturePrefix === undefined
        ? {}
        : { dependencySignaturePrefix: options.dependencySignaturePrefix })
    };

    rootByCellId.set(cell.id, createQuireTableCellSubLayoutRoot({
      cell,
      childFlowBox,
      retainedRoot: readRetainedSubLayoutRoot(childFlowBox),
      parentId: options.parentId,
      dependencySignature: options.createDependencySignature?.(signatureRequest) ??
        createQuireTableCellSubLayoutRootMapDependencySignature(signatureRequest)
    }));
  }

  return rootByCellId;
}

/**
 * Reads the canonical provider-owned root retained on a source cell box.
 *
 * @param box - Source cell layout box.
 * @returns Retained sub-layout root preserved across page projection.
 */
function readRetainedSubLayoutRoot(
  box: QuireLayoutBox
): QuireTableCellSubLayoutRoot {
  const projection: QuireSubLayoutProjection | undefined =
    box.subLayoutFragments?.[0]?.subLayout;
  if (projection === undefined) {
    throw new RangeError(
      `Table-cell child flow "${box.id}" has no retained sub-layout root.`
    );
  }

  return {
    geometry: projection.geometry.root,
    view: projection.view.root
  };
}

/**
 * Creates a stable dependency signature for a root produced by the root map.
 *
 * @param request - Signature request for one produced table-cell root.
 * @returns Dependency signature for the produced root.
 */
function createQuireTableCellSubLayoutRootMapDependencySignature(
  request: QuireTableCellSubLayoutRootMapDependencySignatureRequest
): string {
  return [
    request.dependencySignaturePrefix ?? "table-cell-sub-layout-root-map",
    request.parentId,
    request.cell.id,
    request.sourceCellId,
    request.cell.contentRect.x,
    request.cell.contentRect.y,
    request.cell.contentRect.width,
    request.cell.contentRect.height,
    request.childFlowBox.rect.x,
    request.childFlowBox.rect.y,
    request.childFlowBox.rect.width,
    request.childFlowBox.rect.height
  ].join("|");
}

/**
 * Creates the private measured child-flow lookup consumed by the root map.
 *
 * @param children - Source layout boxes that may contain table-cell child flows.
 * @returns Layout boxes keyed by their stable source ids.
 */
function createQuireTableCellChildFlowLookup(
  children: readonly QuireLayoutBox[]
): ReadonlyMap<string, QuireLayoutBox> {
  return createQuireTableCellLayoutBoxLookup(children);
}
