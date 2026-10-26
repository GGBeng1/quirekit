import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import {
  createQuireRetainedDisplayOwnerKey,
  resolveQuireDisplayOwnerPageIndexes,
  unionQuireDisplayOwnerRects
} from "./identity";
import type {
  CreateQuireRetainedDisplayOwnerIndexOptions,
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerGap
} from "./types";

/** Paint-only capabilities assigned to annotation sources. */
const quireAnnotationPaintCapabilities = {
  editable: false,
  selectable: false,
  focusable: false,
  copyable: false,
  commandable: false,
  accessible: false
} as const;

/**
 * Adds transient selection and annotation products with explicit ownership.
 *
 * @param options - Owner compilation inputs carrying transient geometry.
 * @param owners - Mutable deterministic owner output.
 * @param gaps - Mutable explicit ownership-gap output.
 * @returns Nothing.
 */
export function appendQuireTransientDisplayOwners(
  options: CreateQuireRetainedDisplayOwnerIndexOptions,
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[]
): void {
  appendQuireSelectionOwner(options, owners, gaps);
  appendQuireAnnotationOwners(options, owners, gaps);
}

/**
 * Adds one root-owned selection overlay product for the current geometry.
 *
 * @param options - Owner compilation inputs carrying selection geometry.
 * @param owners - Mutable deterministic owner output.
 * @param gaps - Mutable explicit ownership-gap output.
 * @returns Nothing.
 */
function appendQuireSelectionOwner(
  options: CreateQuireRetainedDisplayOwnerIndexOptions,
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[]
): void {
  const geometry = options.selectionGeometry;
  const visuals = [
    ...(options.decorationLane?.invisibleCharacters ?? []),...(geometry?.ranges ?? []), ...(geometry?.carets ?? [])];
  if (visuals.length === 0) {
    return;
  }
  const rootOwner = options.snapshot.root.layoutOwner;
  if (rootOwner === undefined) {
    gaps.push({
      code: "selection-owner-missing",
      productId: "selection-overlay",
      message: "Selection geometry has no explicit root owner for overlay realization."
    });
    return;
  }
  const rect = unionQuireDisplayOwnerRects(visuals.map((visual) => visual.rect));
  const range = {
    from: Math.min(
      ...geometry!.ranges.map((visual) => visual.range.from),
      ...geometry!.carets.map((visual) => visual.position.pos)
    ),
    to: Math.max(
      ...geometry!.ranges.map((visual) => visual.range.to),
      ...geometry!.carets.map((visual) => visual.position.pos)
    )
  };
  owners.push({
    key: createQuireRetainedDisplayOwnerKey(
      "selection",
      "selection-overlay",
      "selection-overlay",
      rootOwner
    ),
    kind: "selection",
    productId: "selection-overlay",
    paintScope: "selection-overlay",
    region: rootOwner.region,
    source: rootOwner.source,
    capabilities: rootOwner.capabilities,
    range,
    rect,
    pageIndexes: resolveQuireDisplayOwnerPageIndexes(
      rect,
      options.realizationPages ?? options.snapshot.pages ?? []
    ),
    ancestorOwnerKeys: [],
    lanes: ["overlay"]
  });
}

/**
 * Adds one paint-only annotation owner per stable decoration source.
 *
 * @param options - Owner compilation inputs carrying decoration lanes.
 * @param owners - Mutable deterministic owner output.
 * @param gaps - Mutable explicit ownership-gap output.
 * @returns Nothing.
 */
function appendQuireAnnotationOwners(
  options: CreateQuireRetainedDisplayOwnerIndexOptions,
  owners: QuireRetainedDisplayOwner[],
  gaps: QuireRetainedDisplayOwnerGap[]
): void {
  const visuals = [
    ...(options.decorationLane?.invisibleCharacters ?? []),
    ...(options.decorationLane?.backgrounds ?? []),
    ...(options.decorationLane?.nodes ?? []),
    ...(options.decorationLane?.pointMarkers ?? []),
    ...(options.decorationLane?.gutterMarkers ?? [])
  ];
  if (visuals.length === 0) {
    return;
  }
  const rootOwner = options.snapshot.root.layoutOwner;
  if (rootOwner === undefined) {
    gaps.push({
      code: "annotation-owner-missing",
      productId: "annotation-overlay",
      message: "Decoration visuals have no explicit root region for annotation realization."
    });
    return;
  }
  const visualsByDecorationId = new Map<string, Array<(typeof visuals)[number]>>();
  for (const visual of visuals) {
    const entries = visualsByDecorationId.get(visual.decorationId);
    if (entries === undefined) visualsByDecorationId.set(visual.decorationId, [visual]);
    else entries.push(visual);
  }
  for (const [decorationId, sourceVisuals] of visualsByDecorationId) {
    const productId = `annotation:${decorationId}`;
    const rect = unionQuireDisplayOwnerRects(sourceVisuals.map((visual) => visual.rect));
    const range = sourceVisuals.reduce(
      (bounds, visual) => ({ from: Math.min(bounds.from, visual.range.from), to: Math.max(bounds.to, visual.range.to) }),
      { from: Number.POSITIVE_INFINITY, to: Number.NEGATIVE_INFINITY }
    );
    const ownerFacts: QuireLayoutOwnerFacts = {
      region: rootOwner.region,
      source: { sourceId: productId, range },
      capabilities: quireAnnotationPaintCapabilities
    };
    owners.push({
      key: createQuireRetainedDisplayOwnerKey(
        "annotation",
        "annotation-overlay",
        productId,
        ownerFacts
      ),
      kind: "annotation",
      productId,
      paintScope: "annotation-overlay",
      region: ownerFacts.region,
      source: ownerFacts.source,
      capabilities: ownerFacts.capabilities,
      range,
      rect,
      pageIndexes: resolveQuireDisplayOwnerPageIndexes(
        rect,
        options.realizationPages ?? options.snapshot.pages ?? []
      ),
      ancestorOwnerKeys: [],
      lanes: ["overlay"]
    });
  }
}
