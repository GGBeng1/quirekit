import { createEditor } from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import {
  deferQuireLayerContributionBody,
  isQuireLayerContributionBodyPending,
  readQuireLayerContributionHeader
} from "../../layout/region-products/layer-contribution/deferred";
import type { QuireRetainedLayerContribution } from "../../layout/region-products/layer-contribution/types";
import { collectQuireRuntimeLayerRealizationIds } from "../../interaction/render-snapshot/layer-contributions";
import type { QuireLayoutSnapshot } from "../types";
import { collectQuireActivatedLayerCommandIds, isQuireRetainedLayerContributionActive } from "./activation";

describe("retained layer contribution activation", () => {
  it("activates selected-owner products only for the exact node selection", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] }
    });
    const firstNodeSize = editor.state.doc.child(0).nodeSize;
    const contribution = createContribution({
      range: { from: 0, to: firstNodeSize },
      activation: { kind: "selected-owner" }
    });

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      NodeSelection.create(editor.state.doc, 0)
    ));
    const selectedFirst = editor.state;
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      NodeSelection.create(editor.state.doc, firstNodeSize)
    ));
    const selectedSecond = editor.state;
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 1)
    ));
    const textSelection = editor.state;

    expect(isQuireRetainedLayerContributionActive(contribution, selectedFirst)).toBe(true);
    expect(isQuireRetainedLayerContributionActive(contribution, selectedSecond)).toBe(false);
    expect(isQuireRetainedLayerContributionActive(contribution, textSelection)).toBe(false);
  });

  it("collects cleanup ids only from realized chrome and leaves unread chrome unrealized", () => {
    const produce = vi.fn(() => ({
      commands: [{ id: "handle", kind: "fill-rect" as const, rect: { x: 0, y: 0, width: 4, height: 4 }, fillStyle: "#000" }],
      domOverlays: [{ id: "overlay", rect: { x: 0, y: 0, width: 4, height: 4 }, html: "" }],
      targets: []
    }));
    const header = readQuireLayerContributionHeader(createContribution({ activation: { kind: "selected-owner" } }));
    const unread = deferQuireLayerContributionBody<QuireRetainedLayerContribution>(header, produce);
    const painted = deferQuireLayerContributionBody<QuireRetainedLayerContribution>(
      { ...header, contributionId: "painted" }, produce);
    void painted.commands;
    const snapshot = { layerContributions: [unread, painted] } as unknown as QuireLayoutSnapshot;

    expect([...collectQuireActivatedLayerCommandIds([unread, painted], "overlay")]).toEqual(["handle"]);
    expect([...collectQuireRuntimeLayerRealizationIds(snapshot).domOverlayIds]).toEqual(["overlay"]);
    expect(collectQuireRuntimeLayerRealizationIds(snapshot).productIds.size).toBe(2);
    expect(isQuireLayerContributionBodyPending(unread)).toBe(true);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it("keeps contributions without activation enabled", () => {
    const editor = createEditor({ extensions: [StarterKit] });

    expect(isQuireRetainedLayerContributionActive(
      createContribution(),
      editor.state
    )).toBe(true);
  });

  it("keeps selected-owner controls active inside an explicit related range", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "related ordinary" }]
        }]
      }
    });
    const contribution = createContribution({
      range: { from: 0, to: editor.state.doc.child(0).nodeSize },
      activation: {
        kind: "selected-owner",
        relatedRange: { from: 2, to: 8 }
      }
    });

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 3, 7)
    ));
    expect(isQuireRetainedLayerContributionActive(contribution, editor.state)).toBe(true);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 9)
    ));
    expect(isQuireRetainedLayerContributionActive(contribution, editor.state)).toBe(false);
  });
});

/**
 * Creates one minimal canonical contribution fixture.
 *
 * @param overrides - Contribution fields to replace.
 * @returns Complete retained layer contribution.
 */
function createContribution(
  overrides: Partial<QuireRetainedLayerContribution> = {}
): QuireRetainedLayerContribution {
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;

  return {
    contributionId: "fixture-controls",
    owner: {
      root: {
        id: { value: "root:fixture" },
        kind: "block-container",
        source: { sourceId: "source:fixture", range: { from: 0, to: 2 } },
        capabilities
      },
      region: {
        rootId: { value: "root:fixture" },
        regionId: { value: "region:fixture" },
        kind: "control"
      },
      source: { sourceId: "source:fixture", range: { from: 0, to: 2 } },
      capabilities
    },
    range: { from: 0, to: 2 },
    rect: { x: 0, y: 0, width: 100, height: 60 },
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    commands: [],
    domOverlays: [],
    targets: [],
    ...overrides
  };
}
