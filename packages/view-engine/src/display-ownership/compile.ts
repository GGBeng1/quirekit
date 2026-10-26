import type { QuireLayoutNode } from "../layout";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import {
  createQuireRetainedDisplayOwnerKey,
  resolveQuireDisplayOwnerPageIndexes
} from "./identity";
import { appendQuireTransientDisplayOwners } from "./transient";
import type {
  CreateQuireRetainedDisplayOwnerIndexOptions,
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerGap,
  QuireRetainedDisplayOwnerIndex
} from "./types";
import { resolveQuireLayerContributionProductId } from "../layout/region-products/layer-contribution/identity";

/**
 * Compiles direct display owners from explicit layout ownership facts.
 *
 * The compiler deliberately refuses to derive roots, regions, sources, or
 * visual instances from page geometry. A page is only an index over owners;
 * this preserves repeated-region identity across pagination and backends.
 *
 * @param options - Immutable snapshot that supplies retained layout products.
 * @returns Indexed direct display owners plus explicit ownership gaps.
 */
export function createQuireRetainedDisplayOwnerIndex(
  options: CreateQuireRetainedDisplayOwnerIndexOptions
): QuireRetainedDisplayOwnerIndex {
  const owners: QuireRetainedDisplayOwner[] = [];
  const gaps: QuireRetainedDisplayOwnerGap[] = [];
  const realizationPages = options.realizationPages ?? options.snapshot.pages ?? [];

  collectQuireLayoutNodeDisplayOwners(
    options.snapshot.root,
    realizationPages,
    owners,
    gaps,
    []
  );
  appendQuirePageChromeOwners(options.snapshot, realizationPages, owners, gaps);
  appendQuireLayerContributionOwners(options.snapshot, realizationPages, owners);
  appendQuireTransientDisplayOwners(options, owners, gaps);
  rejectAmbiguousRepeatedVisualOwners(owners, gaps);

  const ownersByKey: Record<string, QuireRetainedDisplayOwner> = {};
  const ownerKeysByPageIndex: Record<number, string[]> = {};

  for (const owner of owners) {
    ownersByKey[owner.key] = owner;
    for (const pageIndex of owner.pageIndexes) {
      const keys = ownerKeysByPageIndex[pageIndex] ?? [];
      keys.push(owner.key);
      ownerKeysByPageIndex[pageIndex] = keys;
    }
  }

  return {
    owners,
    ownersByKey,
    ownerKeysByPageIndex,
    gaps
  };
}

/**
 * Adds exact region-owned layer contributions as direct display owners.
 *
 * Contribution compilation already guarantees root, region, source, capability,
 * coordinate-space, and paint-surface facts. This stage preserves those facts
 * verbatim and does not route through the document root owner.
 *
 * @param snapshot - Snapshot carrying compiled retained layer contributions.
 * @param realizationPages - Concrete pages used for membership indexing.
 * @param owners - Mutable deterministic owner output.
 * @returns Nothing.
 */
function appendQuireLayerContributionOwners(
  snapshot: CreateQuireRetainedDisplayOwnerIndexOptions["snapshot"],
  realizationPages: NonNullable<CreateQuireRetainedDisplayOwnerIndexOptions["realizationPages"]>,
  owners: QuireRetainedDisplayOwner[]
): void {
  for (const contribution of snapshot.layerContributions ?? []) {
    const paintScope = contribution.paintSurface === "content"
      ? "layer-content"
      : "layer-overlay";
    const ownerFacts: QuireLayoutOwnerFacts = {
      region: contribution.owner.region,
      source: contribution.owner.source,
      capabilities: contribution.owner.capabilities
    };

    const productId = resolveQuireLayerContributionProductId(contribution);
    owners.push({
      key: createQuireRetainedDisplayOwnerKey(
        "layer-contribution",
        paintScope,
        productId,
        ownerFacts
      ),
      kind: "layer-contribution",
      productId,
      paintScope,
      region: ownerFacts.region,
      source: ownerFacts.source,
      capabilities: ownerFacts.capabilities,
      range: contribution.range,
      rect: contribution.rect,
      pageIndexes: resolveQuireDisplayOwnerPageIndexes(
        contribution.visualBounds ?? contribution.rect,
        realizationPages
      ),
      ancestorOwnerKeys: [],
      lanes: [contribution.paintSurface]
    });
  }
}

/**
 * Recursively collects paintable layout-node and sub-layout display owners.
 *
 * @param node - Current layout node in source order.
 * @param pages - Paginated page rectangles used only for membership indexing.
 * @param owners - Mutable deterministic owner output.
 * @param gaps - Mutable explicit ownership-gap output.
 * @param ancestorOwnerKeys - Nearest-to-farthest retained content ancestors.
 * @param paintClipRect - Inherited hard paint boundary in final document space.
 */
function collectQuireLayoutNodeDisplayOwners(
  node: QuireLayoutNode,
  pages: readonly { readonly pageIndex: number; readonly pageRect: QuireRetainedDisplayOwner["rect"] }[],
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[],
  ancestorOwnerKeys: readonly string[],
  paintClipRect?: QuireRetainedDisplayOwner["rect"]
): void {
  paintClipRect = node.paintClipRect ?? paintClipRect;
  const layoutOwner = node.layoutOwner;
  let nextAncestorOwnerKeys = ancestorOwnerKeys;

  if (isQuirePaintableLayoutNode(node)) {
    if (layoutOwner === undefined) {
      gaps.push({
        code: "layout-owner-missing",
        productId: node.id,
        message: `Paintable layout node "${node.id}" does not carry explicit retained owner facts.`
      });
    } else {
      const owner = createQuireLayoutNodeDisplayOwner(
        node,
        layoutOwner,
        pages,
        ancestorOwnerKeys,
        paintClipRect
      );
      owners.push(owner);
      nextAncestorOwnerKeys = [owner.key, ...ancestorOwnerKeys];
    }
  }

  for (const chunk of node.subLayoutDisplayChunks ?? []) {
    if (layoutOwner === undefined) {
      gaps.push({
        code: "sub-layout-owner-missing",
        productId: chunk.key,
        message: `Sub-layout display chunk "${chunk.key}" has no exact source/capability owner facts.`
      });
      continue;
    }

    owners.push({
      key: createQuireRetainedDisplayOwnerKey(
        "sub-layout",
        "sub-layout-content",
        chunk.key,
        layoutOwner
      ),
      kind: "sub-layout",
      productId: chunk.key,
      paintScope: "sub-layout-content",
      region: chunk.queryOwner.region ?? layoutOwner.region,
      source: layoutOwner.source,
      capabilities: layoutOwner.capabilities,
      range: node.range,
      rect: paintClipRect ?? chunk.rect,
      pageIndexes: resolveQuireDisplayOwnerPageIndexes(paintClipRect ?? chunk.rect, pages),
      ancestorOwnerKeys: nextAncestorOwnerKeys,
      lanes: ["content", "overlay"],
      dependencySignature: chunk.dependencySignature
    });
  }

  // Table paint emits one self-contained command tree, including clipped cell
  // content. Descending here would assign the same persistent commands to both
  // the table and its cell descendants, so the table is the only direct owner.
  if (node.table !== undefined) {
    return;
  }

  for (const child of node.children ?? []) {
    collectQuireLayoutNodeDisplayOwners(
      child,
      pages,
      owners,
      gaps,
      nextAncestorOwnerKeys,
      paintClipRect
    );
  }
}

/**
 * Adds page-chrome owners when a paginated snapshot carries one explicit root owner.
 *
 * @param snapshot - Snapshot whose page records should be represented.
 * @param realizationPages - Concrete pages used for membership indexing.
 * @param owners - Mutable deterministic owner output.
 * @param gaps - Mutable explicit ownership-gap output.
 */
function appendQuirePageChromeOwners(
  snapshot: CreateQuireRetainedDisplayOwnerIndexOptions["snapshot"],
  realizationPages: NonNullable<CreateQuireRetainedDisplayOwnerIndexOptions["realizationPages"]>,
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[]
): void {
  if (realizationPages.length === 0) {
    return;
  }

  const rootOwner = snapshot.root.layoutOwner;
  if (rootOwner === undefined) {
    gaps.push({
      code: "page-owner-missing",
      productId: "page-chrome",
      message: "Paginated snapshot pages have no explicit root owner for page-chrome realization."
    });
    return;
  }

  owners.push({
    key: createQuireRetainedDisplayOwnerKey(
      "page-chrome",
      "page-chrome",
      "page-chrome",
      rootOwner
    ),
    kind: "page-chrome",
    productId: "page-chrome",
    paintScope: "page-chrome",
    region: rootOwner.region,
    source: rootOwner.source,
    capabilities: rootOwner.capabilities,
    range: snapshot.root.range,
    rect: snapshot.documentRect,
    pageIndexes: realizationPages.map((page) => page.pageIndex),
    ancestorOwnerKeys: [],
    lanes: ["content", "overlay"]
  });
}

/**
 * Creates one layout-node owner from a paintable node with complete facts.
 *
 * @param node - Paintable layout node.
 * @param owner - Explicit owner facts carried by the node.
 * @param pages - Paginated page rectangles used only for membership indexing.
 * @param ancestorOwnerKeys - Nearest-to-farthest retained content ancestors.
 * @param paintClipRect - Inherited final-space boundary of a page-owned paint subtree.
 * @returns Direct owner for the layout node's content and overlay lanes.
 */
function createQuireLayoutNodeDisplayOwner(
  node: QuireLayoutNode,
  owner: QuireLayoutOwnerFacts,
  pages: readonly { readonly pageIndex: number; readonly pageRect: QuireRetainedDisplayOwner["rect"] }[],
  ancestorOwnerKeys: readonly string[],
  paintClipRect?: QuireRetainedDisplayOwner["rect"]
): QuireRetainedDisplayOwner {
  // A drawing's source rows may lie on a different paper before its affine
  // fit/rotation. Its hard occurrence boundary owns membership, never those rows.
  const visualRect = paintClipRect ?? node.table?.rect ?? node.rect;

  return {
    key: createQuireRetainedDisplayOwnerKey(
      "layout-node",
      "layout-content",
      node.id,
      owner
    ),
    kind: "layout-node",
    productId: node.id,
    paintScope: "layout-content",
    region: owner.region,
    source: owner.source,
    capabilities: owner.capabilities,
    range: node.range,
    rect: visualRect,
    pageIndexes: resolveQuireDisplayOwnerPageIndexes(visualRect, pages),
    ancestorOwnerKeys,
    lanes: ["content", "overlay"]
  };
}

/**
 * Rejects repeated source-region occurrences that omit visual-instance identity.
 *
 * A single source occurrence may omit `visualInstanceId`. Once the same source
 * is realized more than once inside one region, every ambiguous occurrence is
 * removed and surfaced as a typed gap instead of using geometry or source order
 * as an identity substitute.
 *
 * @param owners - Mutable owner list compiled from explicit retained products.
 * @param gaps - Mutable typed gap output.
 * @returns Nothing.
 */
function rejectAmbiguousRepeatedVisualOwners(
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[]
): void {
  const occurrenceCounts = new Map<string, number>();

  for (const owner of owners) {
    if (owner.kind === "page-chrome") {
      continue;
    }
    const occurrenceKey = createQuireDisplayOwnerOccurrenceKey(owner);
    occurrenceCounts.set(occurrenceKey, (occurrenceCounts.get(occurrenceKey) ?? 0) + 1);
  }

  for (let index = owners.length - 1; index >= 0; index -= 1) {
    const owner = owners[index]!;
    if (
      owner.kind === "page-chrome" ||
      owner.region.visualInstanceId !== undefined ||
      (occurrenceCounts.get(createQuireDisplayOwnerOccurrenceKey(owner)) ?? 0) < 2
    ) {
      continue;
    }

    gaps.unshift({
      code: "visual-instance-missing",
      productId: owner.productId,
      message: `Repeated display owner "${owner.productId}" omits required visual-instance identity.`
    });
    owners.splice(index, 1);
  }
}

/**
 * Creates a repeated-occurrence key without using geometry or page membership.
 *
 * @param owner - Retained display owner to classify.
 * @returns Root/region/source/paint-scope occurrence key.
 */
function createQuireDisplayOwnerOccurrenceKey(
  owner: QuireRetainedDisplayOwner
): string {
  return JSON.stringify([
    owner.kind,
    owner.paintScope,
    owner.productId,
    owner.region.rootId.value,
    owner.region.regionId.value,
    owner.source.sourceId
  ]);
}

/**
 * Reports whether a layout node can directly emit persistent display content.
 *
 * @param node - Layout node to classify.
 * @returns Whether the node owns paintable content rather than helper geometry.
 */
function isQuirePaintableLayoutNode(node: QuireLayoutNode): boolean {
  if (node.interactionRole === "source-geometry") {
    return false;
  }

  return node.table !== undefined
    || (node.textFragments?.length ?? 0) > 0
    || (node.children?.length ?? 0) === 0;
}
