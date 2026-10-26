import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireMeasuredContainerSourceFragment,
  QuireMeasuredContainerSourceFragmentKind,
  QuirePageFragment
} from "@quirekit/layout/pagination";
import type {
  QuireLayoutBox,
  QuireLayoutDocument
} from "../../src/layout/engine/types";
import type { QuireRetainedRegionProducts } from "../../src/layout/region-products";

/** Block fixture used by pagination tests. */
export interface BlockFixture {
  /** Stable block id. */
  readonly id: string;
  /** Inclusive document start position. */
  readonly from: number;
  /** Exclusive document end position. */
  readonly to: number;
  /** Infinite-flow y coordinate. */
  readonly y: number;
  /** Infinite-flow block height. */
  readonly height: number;
  /** Optional text fragments owned by the block. */
  readonly textFragments?: readonly QuireTextFragment[];
}

/** Options for creating line fragment fixtures. */
export interface LineFragmentFixtureOptions {
  /** Number of line fragments to create. */
  readonly lineCount: number;
  /** Infinite-flow y coordinate of the first line. */
  readonly y: number;
}

/** Source-flow band summary used by pagination invariants. */
export interface PageSourceFlowBandSummary {
  /** Page index that owns the accepted source-flow band. */
  readonly pageIndex: number;
  /** Accepted source-flow y coordinate for the page fragment. */
  readonly sourceFlowY: number | undefined;
  /** Accepted source-flow height for the page fragment. */
  readonly sourceFlowHeight: number | undefined;
}

/** Source-fragment summary used by pagination provenance assertions. */
export interface PageSourceFragmentSummary {
  /** Page index that accepted the source fragment. */
  readonly pageIndex: number;
  /** Source-fragment family. */
  readonly kind: QuireMeasuredContainerSourceFragmentKind;
  /** Layout or semantic owner that emitted the source fragment. */
  readonly ownerId: string;
  /** Optional stable semantic owner for merged or continued fragments. */
  readonly semanticOwnerId?: string | undefined;
  /** Optional original source owner for continuation fragments. */
  readonly originOwnerId?: string | undefined;
  /** Editable source range represented by the source fragment. */
  readonly range: QuireMeasuredContainerSourceFragment["range"];
  /** Source-flow top coordinate for the source fragment. */
  readonly flowTop: number;
  /** Source-flow bottom coordinate for the source fragment. */
  readonly flowBottom: number;
}

/**
 * Creates a layout document from block box fixtures.
 *
 * @param boxes - Block fixture boxes to include as document children.
 * @returns Layout document with empty page records.
 */
export function createLayoutDocument(
  boxes: readonly BlockFixture[]
): QuireLayoutDocument {
  const children: QuireLayoutBox[] = boxes.map((box) => ({
    id: box.id,
    range: { from: box.from, to: box.to },
    rect: { x: 0, y: box.y, width: 500, height: box.height },
    ...(box.textFragments === undefined ? {} : { textFragments: box.textFragments })
  }));
  const lastBox = boxes[boxes.length - 1];

  return {
    id: "doc",
    range: {
      from: boxes[0]?.from ?? 0,
      to: lastBox?.to ?? 0
    },
    rect: {
      x: 0,
      y: 0,
      width: 500,
      height: lastBox === undefined ? 0 : lastBox.y + lastBox.height
    },
    children,
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates an empty canonical anchor product bundle for pagination fixtures.
 *
 * @returns Empty retained products satisfying the document contract.
 */
export function createEmptyAnchorRegionProducts(): QuireRetainedRegionProducts {
  return {
    roots: [],
    regions: [],
    hitTargets: [],
    layerContributions: [],
    selectionPolicies: [],
    gaps: []
  };
}

/**
 * Creates page geometry with a fixed body height.
 *
 * @param bodyHeight - Available body height.
 * @returns Page geometry for tests.
 */
export function createPageGeometry(bodyHeight: number) {
  return {
    pageRect: { x: 0, y: 0, width: 600, height: 800 },
    bodyRect: { x: 40, y: 50, width: 500, height: bodyHeight }
  };
}

/**
 * Summarizes page source-flow bands for invariant-focused assertions.
 *
 * @param pages - Page fragments produced by a pagination pass.
 * @returns Page index and accepted source-flow band for each fragment.
 */
export function summarizePageSourceFlowBands(
  pages: readonly QuirePageFragment[]
): readonly PageSourceFlowBandSummary[] {
  return pages.map((page) => ({
    pageIndex: page.pageIndex,
    sourceFlowY: page.sourceFlowY,
    sourceFlowHeight: page.sourceFlowHeight
  }));
}

/**
 * Summarizes page-local source fragments for provenance-focused assertions.
 *
 * @param pages - Page fragments produced by a pagination pass.
 * @returns Page index and source-fragment metadata for each accepted fragment.
 */
export function summarizePageSourceFragments(
  pages: readonly QuirePageFragment[]
): readonly PageSourceFragmentSummary[] {
  return pages.flatMap((page) =>
    (page.sourceFragments ?? []).map((sourceFragment) => ({
      pageIndex: page.pageIndex,
      kind: sourceFragment.kind,
      ownerId: sourceFragment.ownerId,
      ...(sourceFragment.semanticOwnerId === undefined
        ? {}
        : { semanticOwnerId: sourceFragment.semanticOwnerId }),
      ...(sourceFragment.originOwnerId === undefined
        ? {}
        : { originOwnerId: sourceFragment.originOwnerId }),
      range: sourceFragment.range,
      flowTop: sourceFragment.flowTop,
      flowBottom: sourceFragment.flowBottom
    }))
  );
}

/**
 * Creates one text fragment per visual line for pagination tests.
 *
 * @param options - Line count and top coordinate inputs.
 * @returns Text fragments with deterministic document ranges.
 */
export function createLineFragments(
  options: LineFragmentFixtureOptions
): readonly QuireTextFragment[] {
  return Array.from({ length: options.lineCount }, (_, index) => ({
    id: `fragment-${index}`,
    text: `L${index}`,
    range: { from: 1 + index * 3, to: 4 + index * 3 },
    rect: {
      x: 0,
      y: options.y + index * 24,
      width: 120,
      height: 24
    },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: options.y + index * 24 + 18,
    caretStops: []
  }));
}
