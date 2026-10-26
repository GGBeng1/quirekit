import {
  layoutQuireBlockFlowContainer,
  layoutQuireBlockFlowInputUncached
} from "@quirekit/layout/block-flow";
import type {
  QuireBlockContainerLayoutOptions,
  QuireBlockLayoutInput
} from "./block-types";
import type {
  QuireLayoutBox,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "./types";
import {
  collectQuireTableHitTargets
} from "./table/block-layout";
import { createQuireBodyViewGraphProducts } from "../view-graph";
import { normalizeQuireRetainedBlockLayout } from "../retained-block/projection";
import {
  createQuireLayoutViewGraphFields,
  createQuireViewBlockFlowServices
} from "./block-flow/services";
import { collectQuireInlineSourceLayoutAnchors } from "./inline/source-anchor";
import { collectQuireInlineSourceCapabilitySidecars } from "./inline/source-capability";
import { compileQuireInlineRetainedProducts } from "./inline/retained-product";
import type { QuireInlinePlacementGap } from "./inline/placement-reference";
import { reflowQuireBlockFlowChildren } from "./flow-exclusion";

/**
 * Lays out a top-level block document from recursive block inputs.
 *
 * @param options - Document origin, width, spacing, and child block inputs.
 * @returns Renderer-neutral layout document with block boxes.
 */
export function layoutQuireBlockDocument(
  options: QuireBlockContainerLayoutOptions
): QuireLayoutDocument {
  const bodyProducts = createQuireBodyViewGraphProducts(options.range);
  const container = layoutQuireBlockContainer({
    ...options,
    viewRoot: options.viewRoot ?? bodyProducts.viewRoot,
    viewRegion: options.viewRegion ?? bodyProducts.viewRegion,
    viewCapabilities: options.viewCapabilities ?? bodyProducts.viewCapabilities
  });
  const layoutOwner = {
    region: bodyProducts.viewRegion,
    source: bodyProducts.viewRoot.source,
    capabilities: bodyProducts.viewCapabilities
  };
  const anchors = collectQuireInlineSourceLayoutAnchors(container, layoutOwner);
  const sourceCapabilities = collectQuireInlineSourceCapabilitySidecars(container);
  const flowExclusionGaps = collectQuireFlowExclusionGaps(container);
  const anchorCompilation = compileQuireInlineRetainedProducts(
    anchors,
    sourceCapabilities
  );

  return {
    ...container,
    layoutOwner,
    sourceCapabilities,
    anchors,
    anchorOccurrenceGaps: [],
    anchorRegionProducts: anchorCompilation.products,
    flowExclusionGaps,
    anchorPlacementGaps: [
      ...anchorCompilation.placementGaps,
      ...flowExclusionGaps
    ],
    hitTargets: collectQuireTableHitTargets(container),
    pages: []
  };
}

/**
 * Lays out a recursive block container.
 *
 * @param options - Container origin, width, spacing, and child block inputs.
 * @returns Layout container whose height is derived from child content.
 */
export function layoutQuireBlockContainer(
  options: QuireBlockContainerLayoutOptions
): QuireLayoutContainer {
  // Resolve sibling-flow exclusions before either neutral or retained block
  // placement. This phase owns paragraph-to-paragraph lifetime and exact slot
  // signatures; the canonical block engine continues to own final coordinates.
  const preparedOptions = {
    ...options,
    children: reflowQuireBlockFlowChildren({
      children: options.children,
      width: options.rect.width,
      blockGap: options.blockGap,
      ...(options.fragmentBlockSize === undefined
        ? {}
        : { fragmentBlockSize: options.fragmentBlockSize })
    })
  };

  if (preparedOptions.retainedBlockGraph !== undefined) {
    return layoutQuireRetainedBlockContainer(preparedOptions);
  }

  const container = layoutQuireBlockFlowContainer({
    id: preparedOptions.id,
    range: preparedOptions.range,
    rect: preparedOptions.rect,
    blockHeight: preparedOptions.blockHeight,
    blockGap: preparedOptions.blockGap,
    fragmentBlockSize: preparedOptions.fragmentBlockSize,
    children: preparedOptions.children,
    ...createQuireViewBlockFlowServices(preparedOptions, layoutQuireBlockContainer)
  });

  return {
    ...container,
    ...createQuireLayoutViewGraphFields(preparedOptions)
  };
}

/**
 * Reconciles a top-level block container through the retained block graph.
 *
 * The existing block builder still receives document-space coordinates, which
 * keeps provider contracts authoritative. Its result is normalized back to
 * local coordinates before the graph commits the record.
 *
 * @param options - Top-level container options carrying a retained graph.
 * @returns Layout container projected from retained local block records.
 */
function layoutQuireRetainedBlockContainer(
  options: QuireBlockContainerLayoutOptions
): QuireLayoutContainer {
  const graph = options.retainedBlockGraph;
  if (graph === undefined) {
    throw new Error("Retained block layout requires a graph instance.");
  }

  const commit = graph.reconcile({
    children: options.children,
    x: options.rect.x,
    y: options.rect.y,
    width: options.rect.width,
    blockHeight: options.blockHeight,
    blockGap: options.blockGap,
    ...(options.fragmentBlockSize === undefined
      ? {}
      : { fragmentBlockSize: options.fragmentBlockSize }),
    ...(options.layoutDirtyRange === undefined
      ? {}
      : { layoutDirtyRange: options.layoutDirtyRange }),
    dependencyEpochs: options.retainedDependencyEpochs ?? {
      font: 0,
      image: 0,
      lineBreaker: 0,
      decoration: 0
    },
    buildLocalBlock: (input, origin) => {
      const absolute = layoutQuireBlockFlowInputUncached({
        input,
        x: origin.x,
        y: origin.y,
        width: options.rect.width,
        blockHeight: options.blockHeight,
        blockGap: options.blockGap,
        fragmentBlockSize: options.fragmentBlockSize,
        ...createQuireViewBlockFlowServices({
          dirtyRange: options.dirtyRange,
          leafFlowCache: graph.leafFlowCache,
          providerExecutionLifecycle: graph.providerExecutionLifecycle
        }, layoutQuireBlockContainer)
      });

      return normalizeQuireRetainedBlockLayout(absolute, origin.x, origin.y);
    }
  });

  return {
    id: options.id,
    range: options.range,
    rect: {
      x: options.rect.x,
      y: options.rect.y,
      width: options.rect.width,
      height: commit.height
    },
    ...createQuireLayoutViewGraphFields(options),
    children: commit.children
  };
}

/**
 * Collects unique paragraph-local flow failures from a recursive layout tree.
 *
 * @param box - Layout box or container to inspect.
 * @returns Stable failures deduplicated across nested projections.
 */
function collectQuireFlowExclusionGaps(
  box: QuireLayoutBox
): readonly QuireInlinePlacementGap[] {
  const gaps = [...(box.flowExclusionGaps ?? [])];
  if ("children" in box && Array.isArray(box.children)) {
    for (const child of box.children as readonly QuireLayoutBox[]) {
      gaps.push(...collectQuireFlowExclusionGaps(child));
    }
  }

  return gaps.filter((gap, index) => gaps.findIndex((candidate) =>
    candidate.code === gap.code
    && candidate.sourceAnchorId === gap.sourceAnchorId
    && candidate.objectId === gap.objectId
  ) === index);
}
