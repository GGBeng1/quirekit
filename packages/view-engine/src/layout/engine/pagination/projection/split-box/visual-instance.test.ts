import { describe, expect, it } from "vitest";
import type { QuireLayoutBox } from "../../../types";
import { projectQuireLayoutBoxViewProductsToPage } from "./visual-instance";

describe("split-box visual instance projection", () => {
  it("projects primary-owned hit geometry with the page-local region", () => {
    const box = createOwnedBox();
    const pageRect = { x: 20, y: 40, width: 100, height: 40 };
    const projected = projectQuireLayoutBoxViewProductsToPage(box, 2, pageRect);

    expect(projected.viewRegion?.visualInstanceId).toBe("page:2:owned-box");
    expect(projected.regionProducts?.regions[0]?.rect).toEqual(pageRect);
    expect(projected.regionProducts?.hitTargets[0]).toMatchObject({
      rect: pageRect,
      viewRegion: {
        visualInstanceId: "page:2:owned-box"
      },
      interactionHit: {
        region: {
          visualInstanceId: "page:2:owned-box"
        }
      }
    });
    expect(projected.regionProducts?.layerContributions[0]).toMatchObject({
      contributionId: "external-cell-chrome:page:2:owned-box",
      rect: pageRect,
      owner: {
        region: { visualInstanceId: "page:2:owned-box" },
        source: { sourceId: "external:cell:region" },
        capabilities: expect.objectContaining({ commandable: true })
      },
      commands: [{
        id: "external-cell-chrome:clip:page:2:owned-box",
        kind: "clip",
        rect: pageRect,
        commands: [{
          id: "external-cell-source-clip:page:2:owned-box",
          commands: [{
            id: "external-cell-fill:page:2:owned-box",
            rect: { x: 20, y: 40, width: 100, height: 120 }
          }]
        }]
      }],
      domOverlays: [{
        id: "external-cell-overlay:page:2:owned-box",
        rect: { x: 100, y: 70, width: 20, height: 10 }
      }],
      targets: [{
        id: "external-cell-target:page:2:owned-box",
        rect: { x: 100, y: 70, width: 20, height: 10 }
      }]
    });
  });

  it("uses an explicit repeated-story occurrence across every retained product", () => {
    const box = createOwnedBox();
    const pageRect = { x: 20, y: 40, width: 100, height: 40 };
    const visualInstanceId = "page:2:object:fixture:drawing-text:story-a";
    const projected = projectQuireLayoutBoxViewProductsToPage(
      box,
      2,
      pageRect,
      visualInstanceId
    );

    expect(projected.viewRegion?.visualInstanceId).toBe(visualInstanceId);
    expect(projected.regionProducts?.regions[0]?.ref.visualInstanceId).toBe(
      visualInstanceId
    );
    expect(projected.regionProducts?.hitTargets[0]?.viewRegion?.visualInstanceId)
      .toBe(visualInstanceId);
    expect(projected.regionProducts?.layerContributions[0]?.owner.region
      .visualInstanceId).toBe(visualInstanceId);
  });
});

/**
 * Creates one source-flow box with a primary-owned cell target.
 *
 * @returns Layout box whose region and target cover the source rectangle.
 */
function createOwnedBox(): QuireLayoutBox {
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;
  const source = { sourceId: "external:cell:region", range: { from: 2, to: 20 } };
  const rootSource = { sourceId: "external:cell:root", range: { from: 1, to: 21 } };
  const root = {
    id: { value: "root:external:cell" },
    kind: "table-cell" as const,
    source: rootSource,
    capabilities
  };
  const region = {
    rootId: root.id,
    regionId: { value: "region:external:cell" },
    kind: "table-cell" as const
  };
  const rect = { x: 10, y: 100, width: 100, height: 120 };

  return {
    id: "owned-box",
    range: source.range,
    rect,
    viewRoot: root,
    viewRegion: region,
    viewCapabilities: capabilities,
    regionProducts: {
      roots: [root],
      regions: [{
        ref: region,
        source,
        rect,
        coordinateSpace: "document",
        capabilities
      }],
      hitTargets: [{
        id: "external:cell:hit",
        range: source.range,
        rect,
        viewRegion: region,
        interactionHit: {
          kind: "cell",
          region,
          tableId: "external:table",
          cellId: "body"
        }
      }],
      layerContributions: [{
        contributionId: "external-cell-chrome",
        owner: { root, region, source, capabilities },
        range: source.range,
        rect,
        coordinateSpace: "document",
        layer: { plane: "controls" },
        paintSurface: "content",
        commands: [{
          id: "external-cell-source-clip",
          kind: "clip",
          rect,
          commands: [{
            id: "external-cell-fill",
            kind: "fill-rect",
            rect,
            fillStyle: "#fff"
          }]
        }],
        domOverlays: [{
          id: "external-cell-overlay",
          range: source.range,
          rect: { x: 90, y: 130, width: 30, height: 30 },
          html: "<button>Open</button>"
        }],
        targets: [{
          id: "external-cell-target",
          nodePath: "0.1",
          range: source.range,
          rect: { x: 90, y: 130, width: 30, height: 30 },
          pointerEvents: "auto",
          events: { click: { handler: "fixture.open" } }
        }]
      }],
      selectionPolicies: [],
      gaps: []
    }
  };
}
