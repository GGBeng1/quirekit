import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { compileQuireRetainedRegionProductSet } from "../compile";
import type { QuireRetainedRegionProductDeclaration } from "../declaration";
import {
  deferQuireLayerContributionBody,
  isQuireLayerContributionBodyPending,
  readQuireLayerContributionHeader,
  readQuireLayerContributionRealizationGaps
} from "./deferred";
import type { QuireRetainedLayerContributionDeclaration } from "./types";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

describe("retained layer contribution compiler", () => {
  it("resolves the exact root, region, and visual-instance owner", () => {
    const declaration = createDeclaration({
      regions: [
        createRegion("page:b", "source:page:b"),
        createRegion("page:a", "source:page:a")
      ],
      layerContributions: [createContribution({ visualInstanceId: "page:b" })]
    });

    const products = compileQuireRetainedRegionProductSet([declaration]);

    expect(products.gaps).toEqual([]);
    expect(products.layerContributions[0]?.owner).toMatchObject({
      root: { id: { value: "root:fixture" } },
      region: {
        rootId: { value: "root:fixture" },
        regionId: { value: "region:fixture" },
        visualInstanceId: "page:b"
      },
      source: { sourceId: "source:page:b" }
    });
  });

  it("preserves an explicit selected-owner activation contract", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        paintSurface: "overlay",
        activation: { kind: "selected-owner" }
      })]
    })]);

    expect(products.gaps).toEqual([]);
    expect(products.layerContributions[0]?.activation).toEqual({
      kind: "selected-owner"
    });
  });

  it("validates a deferred body on first read and keeps the producer's other contributions", () => {
    const visual = createContribution({ contributionId: "visual" });
    const chrome = deferQuireLayerContributionBody<QuireRetainedLayerContributionDeclaration>(
      { ...readQuireLayerContributionHeader(createContribution()), contributionId: "selection",
        paintSurface: "overlay", activation: { kind: "selected-owner" } },
      // The target id repeats the visual contribution's target.
      () => ({ commands: [createFillCommand("command:chrome")], domOverlays: [], targets: [createTarget("target:control")] })
    );
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [visual, chrome]
    })]);

    expect(products.gaps).toEqual([]);
    expect(products.layerContributions.map((contribution) => contribution.contributionId))
      .toEqual(["visual", "selection"]);
    const compiled = products.layerContributions[1]!;
    expect(isQuireLayerContributionBodyPending(compiled)).toBe(true);
    expect(compiled.commands).toEqual([]);
    expect(compiled.targets).toEqual([]);
    expect(readQuireLayerContributionRealizationGaps(compiled).map((gap) => gap.code))
      .toEqual(["duplicate-layer-target-id"]);
    expect(products.layerContributions[0]!.targets.map((target) => target.id)).toEqual(["target:control"]);
  });

  it("rejects runtime activation on the persistent content surface", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        paintSurface: "content",
        activation: { kind: "selected-owner" }
      })]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toContain(
      "unsupported-layer-contribution-activation"
    );
    expect(products.layerContributions).toEqual([]);
  });

  it("reports a visual-instance mismatch without producing partial products", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      regions: [createRegion("page:a", "source:page:a")],
      layerContributions: [createContribution({ visualInstanceId: "page:missing" })]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toContain(
      "layer-contribution-visual-instance-mismatch"
    );
    expect(products.layerContributions).toEqual([]);
    expect(products.roots).toEqual([]);
  });

  it("requires visual-instance identity when a logical region has multiple occurrences", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      regions: [
        createRegion(undefined, "source:single"),
        createRegion("page:b", "source:page:b")
      ],
      layerContributions: [createContribution()]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toContain(
      "missing-layer-contribution-visual-instance"
    );
    expect(products.layerContributions).toEqual([]);
  });

  it("reports a missing exact region source without producing partial products", () => {
    const region = createRegion(undefined, "source:fixture");
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      regions: [{ ...region, source: undefined }],
      layerContributions: [createContribution()]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toEqual(expect.arrayContaining([
      "missing-region-source",
      "missing-layer-contribution-region"
    ]));
    expect(products.layerContributions).toEqual([]);
  });

  it("rejects duplicate contribution and nested artifact ids", () => {
    const duplicateArtifacts = createContribution({
      contributionId: "duplicate",
      commands: [
        createFillCommand("command:duplicate"),
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 0, width: 100, height: 60 },
          commands: [createFillCommand("command:duplicate")]
        }
      ],
      domOverlays: [
        createOverlay("overlay:duplicate"),
        createOverlay("overlay:duplicate")
      ],
      targets: [
        createTarget("target:duplicate"),
        createTarget("target:duplicate")
      ]
    });
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [
        duplicateArtifacts,
        createContribution({ contributionId: "duplicate" })
      ]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toEqual(expect.arrayContaining([
      "duplicate-layer-contribution-id",
      "duplicate-layer-command-id",
      "duplicate-layer-overlay-id",
      "duplicate-layer-target-id"
    ]));
    expect(products.layerContributions).toEqual([]);
  });

  it("rejects blank command, overlay, and target ids as incomplete", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        commands: [createFillCommand(" ")],
        domOverlays: [createOverlay("")],
        targets: [createTarget(" ")]
      })]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toEqual(expect.arrayContaining([
      "missing-layer-command-id",
      "missing-layer-overlay-id",
      "missing-layer-target-id"
    ]));
    expect(products.layerContributions).toEqual([]);
  });

  it("allows contribution-contained command geometry to rely on a nested clip", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        commands: [{
          id: "clip:control",
          kind: "clip",
          rect: { x: 10, y: 10, width: 20, height: 20 },
          commands: [createFillCommand("fill:clipped")]
        }]
      })]
    })]);

    expect(products.gaps).toEqual([]);
    expect(products.layerContributions).toHaveLength(1);
  });

  it("rejects a runtime command whose paint bounds are unknown", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        commands: [{
          id: "runtime-widget",
          kind: "runtime-widget"
        } as unknown as QuireDisplayCommand]
      })]
    })]);

    expect(products.gaps.map((gap) => gap.code)).toContain(
      "layer-command-rect-outside-contribution"
    );
    expect(products.layerContributions).toEqual([]);
  });

  it("rejects owner range escapes and every out-of-bounds artifact geometry", () => {
    const products = compileQuireRetainedRegionProductSet([createDeclaration({
      layerContributions: [createContribution({
        range: { from: 9, to: 21 },
        rect: { x: -1, y: 0, width: 102, height: 60 },
        commands: createOutOfBoundsCommands(),
        domOverlays: [{
          ...createOverlay("overlay:outside"),
          rect: { x: 90, y: 10, width: 20, height: 20 }
        }],
        targets: [{
          ...createTarget("target:outside"),
          rect: { x: 95, y: 10, width: 10, height: 20 }
        }]
      })]
    })]);
    const codes = products.gaps.map((gap) => gap.code);

    expect(codes).toEqual(expect.arrayContaining([
      "layer-contribution-range-outside-owner",
      "layer-contribution-rect-outside-owner",
      "layer-command-rect-outside-contribution",
      "layer-overlay-rect-outside-contribution",
      "layer-target-rect-outside-contribution"
    ]));
    expect(codes.filter((code) => code === "layer-command-rect-outside-contribution"))
      .toHaveLength(8);
    expect(products.layerContributions).toEqual([]);
  });
});

/**
 * Creates one complete retained product declaration.
 *
 * @param overrides - Declaration fields to replace.
 * @returns Complete declaration fixture.
 */
function createDeclaration(
  overrides: Partial<QuireRetainedRegionProductDeclaration> = {}
): QuireRetainedRegionProductDeclaration {
  return {
    producerId: "fixture-layout",
    sourceKind: "fixture",
    source: { sourceId: "source:fixture", range: { from: 10, to: 20 } },
    root: {
      rootId: "root:fixture",
      kind: "block-container",
      source: { sourceId: "source:root", range: { from: 9, to: 21 } },
      capabilities
    },
    regions: [createRegion(undefined, "source:fixture")],
    layerContributions: [createContribution()],
    ...overrides
  };
}

/**
 * Creates one retained region occurrence.
 *
 * @param visualInstanceId - Repeated visual id, or undefined for one occurrence.
 * @param sourceId - Exact region-owned source id.
 * @returns Region declaration fixture.
 */
function createRegion(
  visualInstanceId: string | undefined,
  sourceId: string
) {
  return {
    regionId: "region:fixture",
    kind: "block-container" as const,
    source: { sourceId, range: { from: 10, to: 20 } },
    rect: { x: 0, y: 0, width: 100, height: 60 },
    coordinateSpace: "document" as const,
    capabilities,
    ...(visualInstanceId === undefined
      ? { visualInstance: { kind: "single" as const } }
      : {
          visualInstance: {
            kind: "repeated" as const,
            visualInstanceId
          }
        })
  };
}

/**
 * Creates one complete layer contribution declaration.
 *
 * @param overrides - Contribution fields to replace.
 * @returns Complete contribution fixture.
 */
function createContribution(
  overrides: Partial<QuireRetainedLayerContributionDeclaration> & {
    readonly visualInstanceId?: string | undefined;
  } = {}
): QuireRetainedLayerContributionDeclaration {
  return {
    contributionId: "fixture-chrome",
    regionId: "region:fixture",
    range: { from: 10, to: 20 },
    rect: { x: 0, y: 0, width: 100, height: 60 },
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "content",
    commands: [createFillCommand("command:fill")],
    domOverlays: [createOverlay("overlay:control")],
    targets: [createTarget("target:control")],
    ...overrides
  };
}

/**
 * Creates one fill command inside the owner region.
 *
 * @param id - Stable command id.
 * @returns Fill command fixture.
 */
function createFillCommand(id: string): QuireDisplayCommand {
  return {
    id,
    kind: "fill-rect",
    rect: { x: 0, y: 0, width: 100, height: 60 },
    fillStyle: "#fff"
  };
}

/**
 * Creates one DOM overlay inside the contribution.
 *
 * @param id - Stable overlay id.
 * @returns DOM overlay fixture.
 */
function createOverlay(id: string) {
  return {
    id,
    range: { from: 10, to: 20 },
    rect: { x: 70, y: 10, width: 20, height: 20 },
    html: "<button>Open</button>"
  };
}

/**
 * Creates one interaction target inside the contribution.
 *
 * @param id - Stable target id.
 * @returns Target fixture.
 */
function createTarget(id: string) {
  return {
    id,
    nodePath: "0.1",
    range: { from: 10, to: 20 },
    rect: { x: 70, y: 10, width: 20, height: 20 },
    pointerEvents: "auto" as const,
    events: { click: { handler: "fixture.open" } }
  };
}

/**
 * Creates all display command kinds with geometry outside the contribution.
 *
 * @returns Commands covering every geometry branch.
 */
function createOutOfBoundsCommands(): readonly QuireDisplayCommand[] {
  const rect = { x: 101, y: 0, width: 2, height: 2 };
  return [
    { id: "fill", kind: "fill-rect", rect, fillStyle: "#fff" },
    {
      id: "text",
      kind: "text",
      rect,
      origin: { x: 101, y: 1 },
      text: "x",
      font: "12px sans-serif",
      fillStyle: "#000"
    },
    {
      id: "glyph",
      kind: "glyph-run",
      rect,
      origin: { x: 101, y: 1 },
      text: "x",
      font: "12px sans-serif",
      fillStyle: "#000",
      glyphCoverage: "complete",
      glyphs: []
    },
    { id: "caret", kind: "caret", rect, fillStyle: "#000" },
    {
      id: "line",
      kind: "line",
      from: { x: 101, y: 1 },
      to: { x: 104, y: 1 },
      strokeStyle: "#000",
      lineWidth: 2
    },
    { id: "path", kind: "path", rect, segments: [] },
    { id: "image", kind: "image", rect },
    { id: "clip", kind: "clip", rect, commands: [] }
  ];
}
