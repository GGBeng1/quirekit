import {
  createQuireChildFlowResult,
  type QuireChildFlowFragment
} from "@quirekit/layout/child-flow";
import {
  createQuireSubLayoutProjection,
  createQuireSubLayoutQueryProducts,
  type QuireLayoutBoxSubLayoutFragment,
  type QuireSubLayoutFragmentSource,
  type QuireSubLayoutOwnership,
  type QuireSubLayoutProjection
} from "../../sub-layout";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../types";
import type {
  QuireTableCellFragment,
  QuireTableViewLayoutInput
} from "../types";

/**
 * Creates a retained child-flow fragment for one single-page table cell.
 *
 * @param options - Table input, cell fragment, and recursive content layout.
 * @returns Retained fragment consumed by snapshot query adaptation.
 */
export function createQuireSinglePageTableCellSubLayoutFragment(options: {
  /** Table source and layout constraints. */
  readonly input: QuireTableViewLayoutInput;
  /** Cell fragment whose content has been laid out. */
  readonly cell: QuireTableCellFragment;
  /** Recursive child layout inside the cell content frame. */
  readonly contentLayout: QuireLayoutContainer;
}): QuireLayoutBoxSubLayoutFragment {
  return {
    subLayout: createQuireSinglePageTableCellSubLayoutProjection(options)
  };
}

/**
 * Creates the geometry and View projection for one single-page table cell.
 *
 * @param options - Table input, cell fragment, and recursive content layout.
 * @returns Child-flow projection consumed by snapshot query products.
 */
function createQuireSinglePageTableCellSubLayoutProjection(options: {
  /** Table source and layout constraints. */
  readonly input: QuireTableViewLayoutInput;
  /** Cell fragment whose content has been laid out. */
  readonly cell: QuireTableCellFragment;
  /** Recursive child layout inside the cell content frame. */
  readonly contentLayout: QuireLayoutContainer;
}): QuireSubLayoutProjection {
  const contentRect = options.cell.contentLayoutRect ?? options.cell.contentRect;
  const fragments = createQuireSinglePageTableCellSubLayoutFragments(
    options.contentLayout.children,
    contentRect
  );
  const fragmentSources = createSinglePageFragmentSources(
    fragments,
    options.contentLayout.children
  );
  const dependencySignature = createQuireSinglePageTableCellSubLayoutSignature({
    input: options.input,
    cell: options.cell,
    contentRect
  });
  const root = {
    id: `${options.cell.id}:sub-layout-root`,
    kind: "table-cell" as const,
    range: options.cell.range,
    placement: {
      parentId: options.cell.id,
      rect: options.cell.rect,
      contentRect,
      clipRect: options.cell.contentRect
    },
    localRect: {
      x: 0,
      y: 0,
      width: contentRect.width,
      height: contentRect.height
    },
    writingMode: "horizontal-tb" as const,
    dependencySignature,
    metadata: {
      tableId: options.input.tableId,
      semanticCellId: options.cell.semanticCellId
    }
  };
  const id = `${options.cell.id}:sub-layout:single-page`;
  const geometry = createQuireChildFlowResult({
    id,
    trackId: options.cell.id,
    root,
    acceptedBand: { top: 0, bottom: contentRect.height },
    fragments,
    localToResult: { x: contentRect.x, y: contentRect.y },
    coordinateSpace: "document",
    contentClip: contentRect,
    interactionClip: options.cell.contentRect,
    continuation: null,
    dependencySignature
  });

  return createQuireSubLayoutProjection({
    geometry,
    root: {
      ownership: createSinglePageOwnership(options.contentLayout),
      sourceBox: options.contentLayout
    },
    fragmentSources,
    queryProducts: createQuireSubLayoutQueryProducts(
      fragments,
      options.cell.contentRect,
      fragmentSources
    )
  });
}

/**
 * Creates canonical fragments for single-page recursive cell content.
 *
 * @param children - Recursive child boxes laid out inside the cell.
 * @param contentRect - Result-space content frame used as the local origin.
 * @returns Canonical child fragments with result and local geometry.
 */
function createQuireSinglePageTableCellSubLayoutFragments(
  children: readonly QuireLayoutBox[],
  contentRect: QuireTableCellFragment["contentRect"]
): readonly QuireChildFlowFragment[] {
  return children.map((child) => ({
    id: child.id,
    sourceId: child.id,
    range: child.range,
    rect: child.rect,
    localRect: {
      x: child.rect.x - contentRect.x,
      y: child.rect.y - contentRect.y,
      width: child.rect.width,
      height: child.rect.height
    },
    ...(child.textFragments === undefined
      ? {}
      : { textFragments: child.textFragments })
  }));
}

/**
 * Attaches recursive source boxes to canonical fragment identities.
 *
 * @param fragments - Canonical single-page fragments.
 * @param children - Recursive source boxes in matching order.
 * @returns View source provenance keyed by fragment identity.
 */
function createSinglePageFragmentSources(
  fragments: readonly QuireChildFlowFragment[],
  children: readonly QuireLayoutBox[]
): readonly QuireSubLayoutFragmentSource[] {
  return fragments.flatMap((fragment, index) => {
    const sourceBox = children[index];
    return sourceBox === undefined ? [] : [{ fragmentId: fragment.id, sourceBox }];
  });
}

/**
 * Resolves complete retained ownership or reports exact missing facts.
 *
 * @param contentLayout - Recursive content layout carrying retained View facts.
 * @returns Resolved ownership or a typed migration gap.
 */
function createSinglePageOwnership(
  contentLayout: QuireLayoutContainer
): QuireSubLayoutOwnership {
  const viewRoot = contentLayout.viewRoot;
  const layoutOwner = contentLayout.layoutOwner;
  const missing: ("root" | "region" | "source" | "capabilities")[] = [];
  if (viewRoot === undefined) {
    missing.push("root");
  }
  if (layoutOwner === undefined) {
    missing.push("region", "source", "capabilities");
  }
  if (viewRoot === undefined || layoutOwner === undefined) {
    return { status: "gap", missing };
  }

  return {
    status: "resolved",
    root: viewRoot,
    owner: layoutOwner,
    ...(contentLayout.regionProducts === undefined
      ? {}
      : { regionProducts: contentLayout.regionProducts }),
    ...(contentLayout.exportFallbacks === undefined
      ? {}
      : { exportFallbacks: contentLayout.exportFallbacks })
  };
}

/**
 * Creates a stable dependency signature for a single-page cell result.
 *
 * @param options - Table input, cell fragment, and content rectangle.
 * @returns Dependency signature for the retained result.
 */
function createQuireSinglePageTableCellSubLayoutSignature(options: {
  /** Table source and layout constraints. */
  readonly input: QuireTableViewLayoutInput;
  /** Cell fragment represented by the result. */
  readonly cell: QuireTableCellFragment;
  /** Result-space content rectangle. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
}): string {
  return [
    options.input.tableId,
    options.cell.semanticCellId,
    options.cell.range.from,
    options.cell.range.to,
    options.contentRect.x,
    options.contentRect.y,
    options.contentRect.width,
    options.contentRect.height
  ].join(":");
}
