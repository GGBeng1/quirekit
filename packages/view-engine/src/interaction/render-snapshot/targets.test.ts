import { createEditor } from "@quirekit/core";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import type {
  QuireRetainedLayerContribution
} from "@quirekit/view-engine";
import { retainQuireLayoutSnapshotForTest } from "../../../test-support/layout";
import { describe, expect, it } from "vitest";
import { createQuireActivatedLayerContributionTargets } from "./targets";

const region: QuireLayoutRegionRef = {
  rootId: { value: "root:drawing" },
  regionId: { value: "region:drawing" },
  kind: "floating-object",
  visualInstanceId: "page:0:drawing"
};

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

describe("activated layer contribution targets", () => {
  it("removes the transition entry target while related drawing text is active", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "drawing story text" }]
        }]
      }
    });
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.pm.doc, 4)
    ));
    const snapshot = retainQuireLayoutSnapshotForTest({
      state: editor.state,
      documentRect: { x: 0, y: 0, width: 300, height: 200 },
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      domOverlays: [],
      hitTargets: [],
      layerContributions: [createSelectedDrawingContribution()],
      root: {
        id: "doc",
        kind: "block",
        range: { from: 0, to: editor.state.pm.doc.content.size },
        rect: { x: 0, y: 0, width: 300, height: 200 },
        children: []
      }
    });

    const targets = createQuireActivatedLayerContributionTargets(snapshot);

    expect(targets.some((target) => target.id.includes("text-entry"))).toBe(false);
    expect(targets.some((target) => target.id.includes("resize-east"))).toBe(true);
    expect(targets.find((target) =>
      target.id.includes("resize-east")
    )?.interactionScope?.region.kind).toBe("header");
  });
});

/**
 * Creates selected drawing controls with one transition target and one handle.
 *
 * @returns Retained controls contribution activated by the related story range.
 */
function createSelectedDrawingContribution(): QuireRetainedLayerContribution {
  const source = { sourceId: "drawing:anchor", range: { from: 0, to: 1 } };
  const root = {
    id: region.rootId,
    kind: "block-container" as const,
    source,
    capabilities
  };
  const rect = { x: 20, y: 30, width: 120, height: 80 };

  return {
    contributionId: "drawing-controls",
    owner: { root, region, source, capabilities },
    interactionScope: {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header",
        visualInstanceId: "page:0:header"
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 0, to: 12 }
      },
      capabilities
    },
    range: source.range,
    rect,
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    activation: {
      kind: "selected-owner",
      relatedRange: { from: 2, to: 10 }
    },
    commands: [],
    domOverlays: [],
    targets: [
      {
        id: "text-entry",
        nodePath: "0",
        rect,
        part: "text-entry",
        pointerEvents: "auto",
        events: {}
      },
      {
        id: "resize-east",
        nodePath: "1",
        rect: { x: 136, y: 66, width: 8, height: 8 },
        part: "resize-east",
        pointerEvents: "auto",
        events: {}
      }
    ]
  } as unknown as QuireRetainedLayerContribution;
}
