import type {
  QuireLayoutRegion,
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireRetainedRegionProducts } from "../../../region-products";
import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants,
  validateQuireViewGraphSnapshot
} from "../../../../view-graph";
import { projectQuireSubLayoutRetainedProductsToPage } from "./sub-layout-region-products";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

describe("sub-layout retained-product page projection", () => {
  it("keeps only visible nested regions and rewrites every product owner", () => {
    const fixture = createFixtureProducts();
    const projected = projectQuireSubLayoutRetainedProductsToPage({
      products: fixture.products,
      primaryRegion: fixture.primary.ref,
      primaryPageRect: { x: 10, y: 100, width: 200, height: 60 },
      sourceClip: { x: 0, y: 0, width: 200, height: 60 },
      translation: { dx: 10, dy: 100 },
      visualInstanceId: "callout:page:0"
    });

    expect(projected.regions.map((region) => region.source?.sourceId)).toEqual([
      "callout",
      "marker-a"
    ]);
    expect(projected.roots.map((root) => root.source.sourceId)).toEqual([
      "callout",
      "marker-a"
    ]);
    const marker = projected.regions.find(
      (region) => region.source?.sourceId === "marker-a"
    );
    expect(marker).toMatchObject({
      rect: { x: 10, y: 120, width: 24, height: 20 },
      ref: {
        visualInstanceId:
          "callout:page:0:root:marker-a:region:word-numbering-marker"
      }
    });
    expect(projected.hitTargets).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("callout:page:0"),
        rect: { x: 10, y: 120, width: 24, height: 20 },
        hitArea: {
          kind: "polygon",
          points: [
            { x: 10, y: 120 },
            { x: 34, y: 120 },
            { x: 34, y: 140 },
            { x: 10, y: 140 }
          ]
        },
        viewRegion: marker?.ref
      })
    ]);
    expect(projected.layerContributions).toEqual([
      expect.objectContaining({
        contributionId: expect.stringContaining("callout:page:0"),
        owner: expect.objectContaining({ region: marker?.ref }),
        rect: { x: 10, y: 120, width: 24, height: 20 },
        targets: [
          expect.objectContaining({
            hitArea: {
              kind: "polygon",
              points: [
                { x: 10, y: 120 },
                { x: 34, y: 120 },
                { x: 34, y: 140 },
                { x: 10, y: 140 }
              ]
            }
          })
        ]
      })
    ]);
    expect(projected.selectionPolicies).toEqual([
      expect.objectContaining({
        policyId: expect.stringContaining("callout:page:0"),
        region: marker?.ref
      })
    ]);
  });

  it("produces a valid graph when sibling pages retain different markers", () => {
    const fixture = createFixtureProducts();
    const first = projectQuireSubLayoutRetainedProductsToPage({
      products: fixture.products,
      primaryRegion: fixture.primary.ref,
      primaryPageRect: { x: 10, y: 100, width: 200, height: 60 },
      sourceClip: { x: 0, y: 0, width: 200, height: 60 },
      translation: { dx: 10, dy: 100 },
      visualInstanceId: "callout:page:0"
    });
    const second = projectQuireSubLayoutRetainedProductsToPage({
      products: fixture.products,
      primaryRegion: fixture.primary.ref,
      primaryPageRect: { x: 10, y: 200, width: 200, height: 60 },
      sourceClip: { x: 0, y: 60, width: 200, height: 60 },
      translation: { dx: 10, dy: 140 },
      visualInstanceId: "callout:page:1"
    });
    const roots = new Map(
      [...first.roots, ...second.roots].map((root) => [
        root.id.value,
        root
      ])
    );
    const result = validateQuireViewGraphSnapshot({
      version: 1,
      performance: {
        invariants: quireViewGraphRequiredPerformanceInvariants,
        invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
          (kind) => ({ kind })
        ),
        queryBudget: {
          kind: "viewport-indexed",
          label: "sub-layout pagination test"
        }
      },
      roots: [...roots.values()],
      regions: [...first.regions, ...second.regions]
    });

    expect(result).toEqual({ valid: true, issues: [] });
    expect([...first.regions, ...second.regions].filter(
      (region) => region.source?.sourceId.startsWith("marker-")
    ).map((region) => region.source?.sourceId)).toEqual([
      "marker-a",
      "marker-b"
    ]);
  });
});

/** Region fixture with its logical root. */
interface RegionFixture {
  /** Logical retained root. */
  readonly root: QuireLayoutRoot;
  /** Source-flow retained region. */
  readonly region: QuireLayoutRegion;
}

/** Complete primary and nested retained-product fixture. */
interface FixtureProducts {
  /** Provider primary region. */
  readonly primary: QuireLayoutRegion;
  /** Combined provider and nested product bundle. */
  readonly products: QuireRetainedRegionProducts;
}

/**
 * Creates one provider primary region and two vertically separated markers.
 *
 * @returns Source-flow retained products spanning two page clips.
 */
function createFixtureProducts(): FixtureProducts {
  const primary = createRegionFixture(
    "callout",
    "region:primary",
    { x: 0, y: 0, width: 200, height: 120 }
  );
  const markerA = createRegionFixture(
    "marker-a",
    "region:word-numbering-marker",
    { x: 0, y: 20, width: 24, height: 20 }
  );
  const markerB = createRegionFixture(
    "marker-b",
    "region:word-numbering-marker",
    { x: 0, y: 80, width: 24, height: 20 }
  );

  return {
    primary: primary.region,
    products: {
      roots: [primary.root, markerA.root, markerB.root],
      regions: [primary.region, markerA.region, markerB.region],
      hitTargets: [
        createMarkerTarget("marker-a", markerA.region.ref, markerA.region.rect!),
        createMarkerTarget("marker-b", markerB.region.ref, markerB.region.rect!)
      ],
      layerContributions: [
        createMarkerContribution(markerA),
        createMarkerContribution(markerB)
      ],
      selectionPolicies: [
        {
          policyId: "marker-a:selection",
          region: markerA.region.ref,
          kind: "control-dispatch"
        },
        {
          policyId: "marker-b:selection",
          region: markerB.region.ref,
          kind: "control-dispatch"
        }
      ],
      gaps: []
    }
  };
}

/**
 * Creates one retained root and region in source-flow coordinates.
 *
 * @param sourceId - Logical source and root identity.
 * @param regionId - Root-local region identity.
 * @param rect - Source-flow region rectangle.
 * @returns Root and region fixture.
 */
function createRegionFixture(
  sourceId: string,
  regionId: string,
  rect: QuireRect
): RegionFixture {
  const source = { sourceId, range: { from: 1, to: 2 } };
  const root: QuireLayoutRoot = {
    id: { value: `root:${sourceId}` },
    kind: "block-container",
    source,
    capabilities
  };
  const ref: QuireLayoutRegionRef = {
    rootId: root.id,
    regionId: { value: regionId },
    kind: "block-container"
  };
  return {
    root,
    region: {
      ref,
      source,
      rect,
      coordinateSpace: "document",
      capabilities
    }
  };
}

/**
 * Creates one marker interaction target.
 *
 * @param sourceId - Marker source identity.
 * @param region - Exact source-flow region.
 * @param rect - Source-flow target rectangle.
 * @returns Region-owned marker target.
 */
function createMarkerTarget(
  sourceId: string,
  region: QuireLayoutRegionRef,
  rect: QuireRect
): QuireRetainedRegionProducts["hitTargets"][number] {
  return {
    id: `${sourceId}:target`,
    range: { from: 1, to: 2 },
    rect,
    hitArea: {
      kind: "polygon",
      points: [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
      ]
    },
    viewRegion: region
  };
}

/**
 * Creates one renderer-neutral marker contribution.
 *
 * @param fixture - Marker root and source-flow region.
 * @returns Region-owned empty-paint contribution with one target.
 */
function createMarkerContribution(
  fixture: RegionFixture
): QuireRetainedRegionProducts["layerContributions"][number] {
  const sourceId = fixture.root.source.sourceId;
  return {
    contributionId: `${sourceId}:control`,
    owner: {
      root: fixture.root,
      region: fixture.region.ref,
      source: fixture.region.source!,
      capabilities
    },
    range: { from: 1, to: 2 },
    rect: fixture.region.rect!,
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "content",
    commands: [],
    domOverlays: [],
    targets: [
      {
        id: `${sourceId}:view-target`,
        nodePath: `${sourceId}.marker`,
        range: { from: 1, to: 2 },
        rect: fixture.region.rect!,
        hitArea: {
          kind: "polygon",
          points: [
            {
              x: fixture.region.rect!.x,
              y: fixture.region.rect!.y
            },
            {
              x: fixture.region.rect!.x + fixture.region.rect!.width,
              y: fixture.region.rect!.y
            },
            {
              x: fixture.region.rect!.x + fixture.region.rect!.width,
              y: fixture.region.rect!.y + fixture.region.rect!.height
            },
            {
              x: fixture.region.rect!.x,
              y: fixture.region.rect!.y + fixture.region.rect!.height
            }
          ]
        },
        pointerEvents: "auto",
        events: {}
      }
    ]
  };
}
