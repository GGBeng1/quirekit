import type { QuireViewTarget } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import { createQuireViewTargetHitTargets } from "./create";

const region: QuireLayoutRegionRef = {
  rootId: { value: "root:body" },
  regionId: { value: "region:widget" },
  kind: "interactive-widget"
};

const capabilities: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};
const source = { sourceId: "fixture:region", range: { from: 2, to: 6 } };

describe("qkView retained layer targets", () => {
  it("does not create an event route without exact source ownership", () => {
    const targets = createQuireViewTargetHitTargets({
      idPrefix: "missing-owner",
      targets: [createTarget({ events: { click: { handler: "fixture.open" } } })],
      viewRegion: region,
      capabilities
    });

    expect(targets).toEqual([]);
  });

  it("preserves owner-only decorations on the annotation layer", () => {
    const targets = createQuireViewTargetHitTargets({
      idPrefix: "decoration-widget",
      targets: [
        createTarget({
          id: "comment-preview",
          owner: {
            kind: "decoration",
            id: "comment-1"
          },
          pointerEvents: "none"
        })
      ],
      viewRegion: region,
      source,
      capabilities
    });

    expect(targets).toEqual([
      expect.objectContaining({
        id: "decoration-widget:comment-preview",
        layer: { plane: "annotation" },
        pointerPolicy: {
          kind: "pass-through",
          shouldFocusEditor: false,
          shouldPreventDefault: false
        }
      })
    ]);
    expect(targets[0]).not.toHaveProperty("interactionHit");
  });

  it("promotes drawing owner targets to object interaction hits", () => {
    const targets = createQuireViewTargetHitTargets({
      idPrefix: "render-view:shape",
      targets: [
        createTarget({
          id: "shape-body",
          owner: {
            kind: "drawing",
            id: "shape-1"
          }
        })
      ],
      viewRegion: region,
      source,
      capabilities
    });

    expect(targets).toEqual([
      expect.objectContaining({
        id: "render-view:shape:shape-body",
        layer: { plane: "drawing" },
        pointerPolicy: {
          kind: "select",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "object",
          objectId: "shape-1",
          region,
          layer: { plane: "drawing" }
        })
      })
    ]);
  });

  it("promotes explicit floating-ui metadata to dispatching controls", () => {
    const targets = createQuireViewTargetHitTargets({
      idPrefix: "render-view:popover",
      targets: [
        createTarget({
          id: "bubble",
          owner: {
            kind: "extension",
            id: "comments",
            metadata: {
              layerPlane: "floating-ui"
            }
          }
        })
      ],
      viewRegion: region,
      source,
      capabilities
    });

    expect(targets).toEqual([
      expect.objectContaining({
        id: "render-view:popover:bubble",
        layer: { plane: "floating-ui" },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "control",
          controlId: "comments",
          region,
          layer: { plane: "floating-ui" }
        })
      })
    ]);
  });

  it("keeps eventful qkView targets on the controls layer", () => {
    const targets = createQuireViewTargetHitTargets({
      idPrefix: "render-view:callout",
      targets: [
        createTarget({
          id: "button",
          role: "button",
          part: "open",
          events: {
            click: { handler: "callout.open" }
          }
        })
      ],
      viewRegion: region,
      source,
      capabilities
    });

    expect(targets).toEqual([
      expect.objectContaining({
        id: "render-view:callout:button",
        layer: { plane: "controls" },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "widget",
          widgetId: "button",
          part: "open",
          region,
          layer: { plane: "controls" }
        })
      })
    ]);
  });
});

/**
 * Creates a qkView target fixture with stable geometry.
 *
 * @param target - Target fields to override.
 * @returns qkView target descriptor.
 */
function createTarget(target: Partial<QuireViewTarget>): QuireViewTarget {
  return {
    id: "target",
    nodePath: "0",
    range: { from: 2, to: 6 },
    rect: { x: 10, y: 20, width: 80, height: 24 },
    pointerEvents: "auto",
    events: {},
    ...target
  };
}
