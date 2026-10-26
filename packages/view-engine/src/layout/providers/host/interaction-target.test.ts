import { describe, expect, it } from "vitest";
import type {
  QuireLayoutProviderInteractionIntent,
  QuireLayoutProviderInteractionTarget
} from "../../../layout-provider/interaction";
import type { QuireLayoutProviderRegionProductsRequest } from "../../../layout-provider/types";
import type {
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import { compileQuireLayoutProviderInteractionTarget } from "./interaction-target";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;
const root: QuireLayoutRoot = {
  id: { value: "provider-root" },
  kind: "block-container",
  source: { sourceId: "provider-source", range: { from: 4, to: 28 } },
  capabilities
};
const region: QuireLayoutRegionRef = {
  rootId: root.id,
  regionId: { value: "provider-region" },
  kind: "block-container",
  visualInstanceId: "provider-occurrence:2"
};
const owner = {
  root,
  region
} as unknown as QuireLayoutProviderRegionProductsRequest["owner"];
const anchor = {
  position: { pos: 8, bias: 1 as const },
  affinity: "after" as const
};

const intentCases: ReadonlyArray<{
  readonly intent: QuireLayoutProviderInteractionIntent;
  readonly expected: Readonly<Record<string, unknown>>;
}> = [
  { intent: { kind: "text", anchor }, expected: { kind: "text" } },
  {
    intent: { kind: "cell", tableId: "table-a", cellId: "cell-b" },
    expected: { kind: "cell", tableId: "table-a", cellId: "cell-b" }
  },
  {
    intent: { kind: "node", nodeId: "node-a", pos: { pos: 7, bias: -1 } },
    expected: { kind: "node", nodeId: "node-a", pos: 7 }
  },
  {
    intent: { kind: "object", objectId: "object-a" },
    expected: { kind: "object", objectId: "object-a" }
  },
  {
    intent: { kind: "media", mediaId: "media-a", part: "poster" },
    expected: { kind: "media", mediaId: "media-a", part: "poster" }
  },
  {
    intent: { kind: "embed", embedId: "embed-a", part: "body" },
    expected: { kind: "embed", embedId: "embed-a", part: "body" }
  },
  {
    intent: {
      kind: "content-control",
      controlId: "content-control-a",
      controlType: "rich-text",
      part: "label"
    },
    expected: {
      kind: "content-control",
      controlId: "content-control-a",
      controlType: "rich-text",
      part: "label",
      range: { from: 4, to: 28 }
    }
  },
  {
    intent: { kind: "widget", widgetId: "widget-a", part: "handle" },
    expected: { kind: "widget", widgetId: "widget-a", part: "handle" }
  },
  {
    intent: { kind: "field", fieldId: "field-a", anchor },
    expected: { kind: "field", fieldId: "field-a" }
  },
  {
    intent: {
      kind: "readonly-text",
      ownerNodeId: "readonly-a",
      range: { from: 9, to: 14 }
    },
    expected: {
      kind: "readonly-text",
      ownerNodeId: "readonly-a",
      range: { from: 9, to: 14 }
    }
  },
  {
    intent: { kind: "boundary-caret", anchor, side: "before" },
    expected: { kind: "boundary-caret", side: "before" }
  },
  {
    intent: { kind: "control", controlId: "control-a" },
    expected: { kind: "control", controlId: "control-a" }
  }
];

describe("layout provider interaction target compiler", () => {
  it.each(intentCases)(
    "injects exact framework authority for $intent.kind intent",
    ({ intent, expected }) => {
      const declaration = compileQuireLayoutProviderInteractionTarget({
        targetId: `target:${intent.kind}`,
        range: { from: 4, to: 28 },
        rect: { x: 12, y: 24, width: 80, height: 30 },
        coordinateSpace: "document",
        intent,
        layer: { plane: "controls", zIndex: 3, priority: 2 },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: false,
          shouldPreventDefault: true
        }
      }, owner);

      expect(declaration).toMatchObject({
        targetId: `target:${intent.kind}`,
        regionId: "provider-region",
        range: { from: 4, to: 28 },
        rect: { x: 12, y: 24, width: 80, height: 30 },
        layer: { plane: "controls", zIndex: 3, priority: 2 },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: false,
          shouldPreventDefault: true
        },
        interactionHit: {
          ...expected,
          region,
          source: root.source,
          capabilities
        }
      });

      if (
        intent.kind === "text"
        || intent.kind === "field"
        || intent.kind === "boundary-caret"
      ) {
        expect(declaration.interactionHit).toMatchObject({
          anchor: {
            rootId: root.id,
            regionId: region.regionId,
            position: anchor.position,
            affinity: anchor.affinity
          }
        });
      }
    }
  );

  it("rejects a provider target whose runtime coordinate tag is not document", () => {
    const target = {
      targetId: "invalid-space",
      range: { from: 4, to: 8 },
      rect: { x: 1, y: 2, width: 3, height: 4 },
      coordinateSpace: "page",
      intent: { kind: "object", objectId: "object-a" }
    } as unknown as QuireLayoutProviderInteractionTarget;

    expect(() => compileQuireLayoutProviderInteractionTarget(target, owner))
      .toThrow(/must use document coordinates/);
  });
});
