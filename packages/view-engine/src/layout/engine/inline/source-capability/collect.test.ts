import { describe, expect, it } from "vitest";
import type { QuireLayoutBox } from "../../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../../sub-layout";
import { createQuireTestSubLayoutProjection } from "../../../../../test-support/layout/sub-layout-projection";
import { collectQuireInlineSourceCapabilitySidecars } from "./collect";
import type { QuireGapInlineSourceCapabilitySidecar } from "./types";

describe("inline source capability collection", () => {
  it("collects regular and nested-flow sidecars in stable source order", () => {
    const nestedCapability = createGap("source:nested", "nestedAtom");
    const childCapability = createGap("source:child", "childAtom");
    const root: QuireLayoutBox & { readonly children: readonly QuireLayoutBox[] } = {
      ...createBox("root", createGap("source:root", "rootAtom")),
      subLayoutFragments: [createNestedFragment(
        createBox("nested", nestedCapability)
      )],
      children: [createBox("child", childCapability)]
    };

    expect(collectQuireInlineSourceCapabilitySidecars(root).map((sidecar) =>
      sidecar.sourceAnchorId
    )).toEqual(["source:root", "source:nested", "source:child"]);
  });

  it("deduplicates equivalent repeated representations", () => {
    const capability = createGap("source:shared", "sharedAtom");
    const root: QuireLayoutBox & { readonly children: readonly QuireLayoutBox[] } = {
      ...createBox("root", capability),
      children: [createBox("child", capability)]
    };

    expect(collectQuireInlineSourceCapabilitySidecars(root)).toEqual([capability]);
  });

  it("rejects conflicting products for one logical source anchor", () => {
    const root: QuireLayoutBox & { readonly children: readonly QuireLayoutBox[] } = {
      ...createBox("root", createGap("source:shared", "sharedAtom")),
      children: [createBox(
        "child",
        createGap("source:shared", "differentAtom")
      )]
    };

    expect(() => collectQuireInlineSourceCapabilitySidecars(root))
      .toThrowError(/conflicting View capability sidecars/u);
  });
});

/**
 * Creates one minimal layout box carrying a capability sidecar.
 *
 * @param id - Stable fixture box id.
 * @param capability - Sidecar retained by the box.
 * @returns Layout box with deterministic geometry and range.
 */
function createBox(
  id: string,
  capability: QuireGapInlineSourceCapabilitySidecar
): QuireLayoutBox {
  return {
    id,
    range: { from: 0, to: 1 },
    rect: { x: 0, y: 0, width: 20, height: 10 },
    sourceCapabilities: [capability]
  };
}

/**
 * Wraps one source box in a canonical nested-flow result.
 *
 * @param sourceBox - Nested source box whose sidecars remain authoritative.
 * @returns Parent fragment accepted by a layout box.
 */
function createNestedFragment(
  sourceBox: QuireLayoutBox
): QuireLayoutBoxSubLayoutFragment {
  return {
    subLayout: createQuireTestSubLayoutProjection({
      root: {
        id: "nested-root",
        kind: "extension-container",
        range: sourceBox.range,
        placement: {
          parentId: "root",
          rect: sourceBox.rect,
          contentRect: sourceBox.rect
        },
        localRect: sourceBox.rect,
        writingMode: "horizontal-tb",
        dependencySignature: "nested:v1"
      },
      resultId: "nested-fragment",
      acceptedBand: { top: 0, bottom: sourceBox.rect.height },
      fragments: [{
        id: "nested-child",
        sourceId: sourceBox.id,
        range: sourceBox.range,
        rect: sourceBox.rect,
        localRect: sourceBox.rect
      }],
      fragmentSources: [{ fragmentId: "nested-child", sourceBox }],
      localToResult: { x: 0, y: 0 },
      contentClip: sourceBox.rect,
      interactionClip: sourceBox.rect,
      dependencySignature: "nested:v1"
    })
  };
}

/**
 * Creates one typed gap sidecar without inventing fallback placement.
 *
 * @param sourceAnchorId - Logical source anchor identity.
 * @param nodeType - Exact node type claimed by the sidecar.
 * @returns Deterministic capability gap fixture.
 */
function createGap(
  sourceAnchorId: string,
  nodeType: string
): QuireGapInlineSourceCapabilitySidecar {
  return {
    sourceAnchorId,
    nodeType,
    status: "gap",
    gaps: [{
      code: "invalid-source-declaration",
      nodeType,
      message: `Invalid ${nodeType}.`
    }]
  };
}
