import { describe, expect, it } from "vitest";
import type { QuireHitTestResult } from "../types";
import {
  resolveQuireExplicitInteractionOwnerFacts
} from "./owner-facts";
import { resolveQuireHitTestSelectionTarget } from "./target";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;
const region = {
  rootId: { value: "root:provider" },
  regionId: { value: "region:provider" },
  kind: "block-container"
} as const;
const source = {
  sourceId: "document-node:provider",
  range: { from: 1, to: 8 }
} as const;

describe("explicit interaction owner facts", () => {
  it("reports missing facts instead of reading them from a query-owner root", () => {
    const result = resolveQuireExplicitInteractionOwnerFacts({ region });

    expect(result).toEqual({
      kind: "gap",
      gap: {
        code: "missing-owner-facts",
        missing: ["source", "capabilities"],
        region
      }
    });
  });

  it("does not route a position hit whose only source facts live on queryOwner", () => {
    const hitTarget = {
      kind: "position",
      position: { pos: 3, bias: 0 },
      inside: 1,
      rect: { x: 10, y: 10, width: 20, height: 20 },
      viewRegion: region,
      queryOwner: {
        sourceRootId: "provider-flow",
        coordinateSpace: "document",
        region,
        root: {
          id: region.rootId,
          kind: "block-container",
          source,
          capabilities
        }
      }
    } satisfies QuireHitTestResult;

    expect(resolveQuireHitTestSelectionTarget({ hitTestResult: hitTarget })).toBeNull();
  });

  it("routes only when the hit carries all explicit owner facts", () => {
    const hitTarget = {
      kind: "position",
      position: { pos: 3, bias: 0 },
      inside: 1,
      rect: { x: 10, y: 10, width: 20, height: 20 },
      viewRegion: region,
      ownerSource: source,
      ownerCapabilities: capabilities
    } satisfies QuireHitTestResult;

    expect(resolveQuireHitTestSelectionTarget({ hitTestResult: hitTarget })).toMatchObject({
      region,
      source,
      capabilities
    });
  });

  it("preserves the exact query-product visual occurrence", () => {
    const visualRegion = { ...region, visualInstanceId: "page:2" };
    const hitTarget = {
      kind: "position",
      position: { pos: 3, bias: 0 },
      inside: 1,
      rect: { x: 10, y: 10, width: 20, height: 20 },
      viewRegion: region,
      queryOwner: {
        sourceRootId: "provider-flow",
        coordinateSpace: "document",
        region: visualRegion
      },
      ownerSource: source,
      ownerCapabilities: capabilities
    } satisfies QuireHitTestResult;

    expect(resolveQuireHitTestSelectionTarget({ hitTestResult: hitTarget })).toMatchObject({
      region: visualRegion,
      source,
      capabilities
    });
  });

  it("preserves an enclosing interaction scope beside the exact owner", () => {
    const interactionScope = {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header" as const,
        visualInstanceId: "page:2:header"
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 10, to: 20 }
      },
      capabilities
    };
    const hitTarget = {
      kind: "position",
      position: { pos: 12, bias: 0 },
      inside: 12,
      rect: { x: 10, y: 10, width: 20, height: 20 },
      viewRegion: region,
      ownerSource: source,
      ownerCapabilities: capabilities,
      interactionScope
    } satisfies QuireHitTestResult;

    expect(resolveQuireHitTestSelectionTarget({ hitTestResult: hitTarget }))
      .toMatchObject({
        region,
        source,
        interactionScope
      });
  });
});
