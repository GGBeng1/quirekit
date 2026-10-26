import { describe, expect, it } from "vitest";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import { createQuireDomOverlayHitTargets } from "./dom-overlays";

const region: QuireLayoutRegionRef = {
  rootId: { value: "root:body" },
  regionId: { value: "region:control" },
  kind: "control"
};

const capabilities: QuireLayoutCapabilitySet = {
  editable: false,
  selectable: false,
  focusable: true,
  copyable: false,
  commandable: true,
  accessible: true
};
const source = { sourceId: "fixture:control", range: { from: 0, to: 4 } };

describe("DOM overlay retained layer targets", () => {
  it("does not create a DOM-proxy route without exact source ownership", () => {
    const targets = createQuireDomOverlayHitTargets({
      idPrefix: "missing-owner",
      overlays: [{
        id: "control",
        range: { from: 0, to: 4 },
        rect: { x: 20, y: 30, width: 120, height: 32 }
      }],
      viewRegion: region,
      capabilities
    });

    expect(targets).toEqual([]);
  });

  it("promotes mounted overlays to dom-proxy dispatch targets", () => {
    const targets = createQuireDomOverlayHitTargets({
      idPrefix: "dom-overlay:callout",
      overlays: [
        {
          id: "0-4:control",
          range: { from: 0, to: 4 },
          rect: { x: 20, y: 30, width: 120, height: 32 },
          html: "<button>Open</button>"
        }
      ],
      viewRegion: region,
      source,
      capabilities
    });

    expect(targets).toEqual([
      expect.objectContaining({
        id: "dom-overlay:callout:0-4:control",
        range: { from: 0, to: 4 },
        rect: { x: 20, y: 30, width: 120, height: 32 },
        viewRegion: region,
        layer: { plane: "dom-proxy" },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "control",
          controlId: "0-4:control",
          region,
          source,
          layer: { plane: "dom-proxy" },
          pointerPolicy: {
            kind: "dispatch",
            shouldFocusEditor: true,
            shouldPreventDefault: true
          },
          capabilities
        })
      })
    ]);
  });
});
