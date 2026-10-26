import {
  cloneQuireTextFragmentWithLazyCaretStops,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireChildFlowResult } from "@quirekit/layout/child-flow";
import {
  createQuireSubLayoutProjection,
  createQuireSubLayoutQueryProducts
} from "../../engine/sub-layout";
import { createQuireSubLayoutQueryProductOwner } from "../../engine/sub-layout/owner";
import type {
  QuireSubLayoutFragmentSource,
  QuireSubLayoutOwnership,
  QuireSubLayoutProjection,
  QuireSubLayoutQueryProducts
} from "../../engine/sub-layout";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../engine/types";
import {
  mergeQuireRetainedRegionProductSets,
  rewriteQuireLayerContributionBody,
  type QuireRetainedRegionProducts
} from "../../region-products";
import {
  translateCompiledViewNode,
  translateQuireHitArea
} from "@quirekit/renderer";
import type {
  QuireLayoutProviderChildFlowRequest,
  QuireLayoutProviderFlowTrack
} from "../types";

/** Materialized child-flow geometry retained by the provider host. */
export interface QuireMaterializedProviderFlow {
  /** Visual child boxes translated into explicit tracks. */
  readonly children: readonly QuireLayoutBox[];
  /** Fragments whose source-box provenance uses the same visual geometry. */
  readonly fragments: readonly QuireSubLayoutProjection[];
}

/**
 * Materializes source boxes at the same geometry as child-flow query products.
 *
 * @param fragments - Canonical child-flow fragments with source-local boxes.
 * @returns Visual boxes and fragments sharing one geometry authority.
 */
export function materializeQuireLayoutProviderFlow(
  results: readonly QuireChildFlowResult[],
  request: QuireLayoutProviderChildFlowRequest
): QuireMaterializedProviderFlow {
  const sourceById = new Map(
    request.source.children.map((child) => [child.id, child])
  );
  const trackById = new Map(request.tracks.map((track) => [track.id, track]));
  const materialized = results.map((result) => {
    const track = trackById.get(result.trackId);
    if (track === undefined) {
      throw new RangeError(
        `Cannot project provider child-flow result ${result.id}: track ${result.trackId} is missing.`
      );
    }
    return createProviderFlowProjection(result, track, request, sourceById);
  });

  return {
    children: materialized.flatMap((projection) =>
      projection.view.fragmentSources.map((source) => source.sourceBox)
    ),
    fragments: materialized
  };
}

/**
 * Attaches provider ownership, source boxes, and interaction products to geometry.
 *
 * @param geometry - Consumer-neutral child-flow result.
 * @param track - Provider track that supplied View ownership facts.
 * @param request - Provider flow request and root authority.
 * @param sourceById - Measured source boxes indexed by source identity.
 * @returns Materialized View projection for the visual track.
 */
function createProviderFlowProjection(
  geometry: QuireChildFlowResult,
  track: QuireLayoutProviderFlowTrack,
  request: QuireLayoutProviderChildFlowRequest,
  sourceById: ReadonlyMap<string, QuireLayoutBox>
): QuireSubLayoutProjection {
  const baseOwnership = createProviderFlowOwnership(track, request);
  const layoutOwner = baseOwnership.status === "resolved"
    ? baseOwnership.owner
    : undefined;
  const fragmentSources: QuireSubLayoutFragmentSource[] = geometry.fragments.flatMap(
    (fragment) => {
      const source = sourceById.get(fragment.sourceId);
      return source === undefined
        ? []
        : [{
            fragmentId: fragment.id,
            sourceBox: translateFlowBox(
              source,
              geometry.localToResult.x,
              geometry.localToResult.y,
              geometry.id,
              fragment.rect,
              layoutOwner
            )
      }];
    }
  );
  // Child layout owns marker hit targets and other retained products. Promote
  // those products into the provider projection before its declarations are
  // compiled so nested paragraphs remain interactive in every host container.
  const nestedProducts = mergeQuireRetainedRegionProductSets(
    fragmentSources.map(({ sourceBox }) =>
      collectFlowBoxRetainedRegionProducts(sourceBox)
    )
  );
  const ownership = baseOwnership.status === "resolved"
    && nestedProducts !== undefined
    ? { ...baseOwnership, regionProducts: nestedProducts }
    : baseOwnership;
  const root = { ownership, sourceBox: request.source };
  const base = createQuireSubLayoutProjection({
    geometry,
    root,
    fragmentSources,
    queryProducts: emptyQueryProducts()
  });
  const queryOwner = createQuireSubLayoutQueryProductOwner(base);
  const queries = createQuireSubLayoutQueryProducts(
    geometry.fragments,
    geometry.interactionClip,
    fragmentSources
  );
  const queryProducts: QuireSubLayoutQueryProducts = {
    selectionRects: queries.selectionRects.map((entry) => ({
      ...entry,
      queryOwner
    })),
    caretStops: queries.caretStops.map((entry) => ({ ...entry, queryOwner })),
    hitTargets: queries.hitTargets.map((entry) => ({
      ...entry,
      viewRegion: track.region,
      queryOwner,
      ...(track.source === undefined ? {} : { source: track.source }),
      ...(track.capabilities === undefined
        ? {}
        : { capabilities: track.capabilities }),
      ...(track.pointerPolicy === undefined
        ? {}
        : { pointerPolicy: track.pointerPolicy })
    })),
    inputAnchors: queries.inputAnchors.map((entry) => ({
      ...entry,
      queryOwner
    }))
  };

  return createQuireSubLayoutProjection({
    geometry,
    root,
    fragmentSources,
    queryProducts
  });
}

/**
 * Collects retained products from one engine-owned flow-box subtree.
 *
 * @param box - Materialized flow box whose descendants share one projection.
 * @returns Stable preorder products, or undefined when the subtree has none.
 */
function collectFlowBoxRetainedRegionProducts(
  box: QuireLayoutBox
): QuireRetainedRegionProducts | undefined {
  const products = mergeQuireRetainedRegionProductSets([
    box.regionProducts,
    ...(isLayoutContainer(box)
      ? box.children.map(collectFlowBoxRetainedRegionProducts)
      : [])
  ]);
  return products !== undefined && hasRetainedRegionProducts(products)
    ? products
    : undefined;
}

/**
 * Reports whether a retained bundle owns any products or diagnostics.
 *
 * @param products - Recursively collected child-flow products.
 * @returns Whether the bundle should be installed on the sub-layout owner.
 */
function hasRetainedRegionProducts(
  products: QuireRetainedRegionProducts
): boolean {
  return products.roots.length > 0
    || products.regions.length > 0
    || products.hitTargets.length > 0
    || products.layerContributions.length > 0
    || products.selectionPolicies.length > 0
    || products.gaps.length > 0;
}

/**
 * Resolves explicit provider ownership or reports the exact missing facts.
 *
 * @param track - Provider visual track.
 * @param request - Provider root authority.
 * @returns Resolved ownership or a typed migration gap.
 */
function createProviderFlowOwnership(
  track: QuireLayoutProviderFlowTrack,
  request: QuireLayoutProviderChildFlowRequest
): QuireSubLayoutOwnership {
  const source = track.source;
  const capabilities = track.capabilities;
  const missing: ("source" | "capabilities")[] = [];
  if (source === undefined) {
    missing.push("source");
  }
  if (capabilities === undefined) {
    missing.push("capabilities");
  }
  if (source === undefined || capabilities === undefined) {
    return { status: "gap", missing };
  }

  return {
    status: "resolved",
    root: request.owner.root,
    owner: {
      region: track.region,
      source,
      capabilities
    }
  };
}

/**
 * Creates an empty query bundle used while deriving its canonical owner facts.
 *
 * @returns Empty query products.
 */
function emptyQueryProducts(): QuireSubLayoutQueryProducts {
  return {
    selectionRects: [],
    caretStops: [],
    hitTargets: [],
    inputAnchors: []
  };
}

/**
 * Translates one source-flow box subtree into a visual track.
 *
 * @param box - Source-flow box.
 * @param dx - Horizontal track offset.
 * @param dy - Vertical track offset.
 * @param fragmentId - Visual fragment identity used to scope layout ids.
 * @param visibleRect - Clipped visible rectangle for the translated root.
 * @param layoutOwner - Exact region owner represented by the visual track.
 * @returns Visual layout box retaining source ranges and owner-local products.
 */
function translateFlowBox(
  box: QuireLayoutBox,
  dx: number,
  dy: number,
  fragmentId: string,
  visibleRect: QuireLayoutBox["rect"],
  layoutOwner: QuireLayoutBox["layoutOwner"]
): QuireLayoutBox {
  const translatedProducts = box.regionProducts === undefined
    ? undefined
    : translateRegionProducts(box.regionProducts, dx, dy);
  const translatedText = box.textFragments?.map((fragment) =>
    translateTextFragment(fragment, dx, dy, fragmentId)
  );
  const common = {
    ...box,
    id: `${box.id}:${fragmentId}`,
    rect: visibleRect,
    ...(layoutOwner === undefined ? {} : { layoutOwner }),
    ...(box.inlineLayoutRect === undefined
      ? {}
      : { inlineLayoutRect: translateRect(box.inlineLayoutRect, dx, dy) }),
    ...(translatedProducts === undefined ? {} : { regionProducts: translatedProducts }),
    ...(translatedText === undefined ? {} : { textFragments: translatedText })
  };

  if (!isLayoutContainer(box)) {
    return common;
  }
  const container: QuireLayoutContainer = {
    ...common,
    children: box.children.map((child) =>
      translateFlowBox(
        child,
        dx,
        dy,
        fragmentId,
        translateRect(child.rect, dx, dy),
        layoutOwner
      )
    )
  };
  return container;
}

/**
 * Translates retained product geometry with its visual owner.
 *
 * @param products - Owner-local canonical products.
 * @param dx - Horizontal offset.
 * @param dy - Vertical offset.
 * @returns Products translated in document coordinate space.
 */
function translateRegionProducts(
  products: QuireRetainedRegionProducts,
  dx: number,
  dy: number
): QuireRetainedRegionProducts {
  return {
    roots: products.roots,
    regions: products.regions.map((region) =>
      region.rect === undefined || region.coordinateSpace !== "document"
        ? region
        : { ...region, rect: translateRect(region.rect, dx, dy) }
    ),
    hitTargets: products.hitTargets.map((target) => ({
      ...target,
      rect: translateRect(target.rect, dx, dy),
      ...(target.hitArea === undefined
        ? {}
        : { hitArea: translateQuireHitArea(target.hitArea, dx, dy) })
    })),
    layerContributions: products.layerContributions.map((contribution) =>
      rewriteQuireLayerContributionBody(contribution, {
        rect: translateCompiledViewNode({ rect: contribution.rect, commands: [], domOverlays: [] }, dx, dy).rect,
        ...(contribution.visualBounds === undefined
          ? {}
          : { visualBounds: translateRect(contribution.visualBounds, dx, dy) })
      }, (body) => {
        const translated = translateCompiledViewNode({ rect: contribution.rect, ...body }, dx, dy);
        return {
          commands: translated.commands,
          domOverlays: translated.domOverlays,
          targets: translated.targets ?? []
        };
      })
    ),
    selectionPolicies: products.selectionPolicies,
    gaps: products.gaps
  };
}

/**
 * Translates one measured text fragment while retaining lazy caret stops.
 *
 * @param fragment - Source-flow text fragment.
 * @param dx - Horizontal offset.
 * @param dy - Vertical offset.
 * @param fragmentId - Visual fragment id used to scope the clone.
 * @returns Translated text fragment.
 */
function translateTextFragment(
  fragment: QuireTextFragment,
  dx: number,
  dy: number,
  fragmentId: string
): QuireTextFragment {
  return cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: `${fragment.id}:${fragmentId}`,
    range: fragment.range,
    rect: translateRect(fragment.rect, dx, dy),
    baseline: fragment.baseline + dy
  });
}

/**
 * Translates one rectangle by a fixed offset.
 *
 * @param rect - Source rectangle.
 * @param dx - Horizontal offset.
 * @param dy - Vertical offset.
 * @returns Translated rectangle.
 */
function translateRect(
  rect: QuireLayoutBox["rect"],
  dx: number,
  dy: number
): QuireLayoutBox["rect"] {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

/**
 * Reports whether one layout box owns recursive children.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a recursive layout container.
 */
function isLayoutContainer(box: QuireLayoutBox): box is QuireLayoutContainer {
  return Array.isArray((box as Partial<QuireLayoutContainer>).children);
}
