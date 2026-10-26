import { createEditor } from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import type { QuireDisplayList } from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import {
  buildQuireRenderInteractionSnapshot,
  createQuireDisplayInvalidationProjection,
  createQuireRetainedDisplayOwnerChunkCollector,
  createQuireRetainedDisplayOwnerDiagnostics,
  createQuireRetainedDisplayOwnerIndex,
  isQuireLayerContributionBodyPending,
  type QuireRetainedLayerContribution
} from "@quirekit/view-engine";
import {
  deferQuireLayerContributionBodyForTest,
  retainQuireLayoutSnapshotForTest
} from "@quirekit/view-engine/test-support/layout";
import { describe, expect, it } from "vitest";
import type { QuireViewRenderResult } from "../../../types";
import { findMountedDrawingTargetContribution } from "../../drawing-interaction/target-contribution";
import { createMountedSelectionUpdateRenderResult } from ".";

describe("deferred selected chrome across selection updates", () => {
  it("paints only the selected drawing's chrome and removes the previous one", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] }
    });
    const a = createChrome("a", { from: 0, to: 2 });
    const b = createChrome("b", { from: 2, to: 4 });
    const select = (position: number) => {
      editor.dispatchTransaction(editor.state.pm.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
      return editor.state;
    };
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1)));
    const accepted = createRenderResult(editor.state, [a, b]);

    const selectedA = createMountedSelectionUpdateRenderResult({ previousRenderResult: accepted, state: select(0),
      rebuildCompositeDisplayList: true });
    expect(commandIds(selectedA.overlayDisplayList)).toEqual(["a:handle"]);
    expect(isQuireLayerContributionBodyPending(b)).toBe(true);

    const selectedB = createMountedSelectionUpdateRenderResult({ previousRenderResult: selectedA, state: select(2),
      rebuildCompositeDisplayList: true });
    expect(commandIds(selectedB.overlayDisplayList)).toEqual(["b:handle"]);
    expect(selectedB.viewTargets.map((target) => target.id)).toEqual(["b:target"]);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1)));
    const deselected = createMountedSelectionUpdateRenderResult({ previousRenderResult: selectedB, state: editor.state,
      rebuildCompositeDisplayList: true });
    expect(commandIds(deselected.overlayDisplayList)).toEqual([]);
  });

  it("finds event targets only among realized chrome", () => {
    const a = createChrome("a", { from: 0, to: 2 });
    const b = createChrome("b", { from: 2, to: 4 });
    void a.targets;
    expect(findMountedDrawingTargetContribution([b, a], "a:target")).toBe(a);
    expect(findMountedDrawingTargetContribution([b, a], "b:target")).toBeUndefined();
    expect(isQuireLayerContributionBodyPending(b)).toBe(true);
  });
});

/**
 * @param id - Drawing identity.
 * @param range - Node range whose selection activates the chrome.
 * @returns Selected-owner chrome whose body is produced on first read.
 */
function createChrome(id: string, range: { readonly from: number; readonly to: number }): QuireRetainedLayerContribution {
  const capabilities = { editable: true, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true };
  const rect = { x: 10, y: 10 + range.from * 50, width: 80, height: 40 };
  return deferQuireLayerContributionBodyForTest<QuireRetainedLayerContribution>({
    contributionId: `selection:${id}`,
    owner: {
      root: { id: { value: `root:${id}` }, kind: "block-container", source: { sourceId: `source:${id}`, range }, capabilities },
      region: { rootId: { value: `root:${id}` }, regionId: { value: `region:${id}` }, kind: "control" },
      source: { sourceId: `source:${id}`, range },
      capabilities
    },
    range,
    rect,
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    activation: { kind: "selected-owner" }
  }, () => ({
    commands: [{ id: `${id}:handle`, kind: "fill-rect", rect, fillStyle: "#2563eb", layer: "overlay" }],
    domOverlays: [],
    targets: [{ id: `${id}:target`, nodePath: "0", rect, range, role: "button", pointerEvents: "auto", events: {} }]
  }));
}

/**
 * Builds the accepted full render for a state where no chrome is active.
 *
 * @param state - Editor state with a text selection.
 * @param contributions - Snapshot layer contributions.
 * @returns Render result without painted chrome.
 */
function createRenderResult(
  state: QuireViewRenderResult["layoutSnapshot"]["state"],
  contributions: readonly QuireRetainedLayerContribution[]
): QuireViewRenderResult {
  const bounds = { x: 0, y: 0, width: 200, height: 300 };
  const layoutSnapshot = retainQuireLayoutSnapshotForTest({
    state, documentRect: bounds, viewportRect: bounds, domOverlays: [], hitTargets: [],
    layerContributions: contributions,
    root: { id: "doc", kind: "block", range: { from: 0, to: 4 }, rect: bounds, children: [] }
  });
  const displayOwnerIndex = createQuireRetainedDisplayOwnerIndex({ snapshot: layoutSnapshot });
  const displayOwnerChunks = createQuireRetainedDisplayOwnerChunkCollector(displayOwnerIndex).finish(bounds);
  const displayInvalidation = createQuireDisplayInvalidationProjection({ ownerIndex: displayOwnerIndex });
  const decorationLane = { interactionTargets: [], backgrounds: [], textStyles: [], nodes: [], pointMarkers: [], widgets: [], diagnostics: [] };
  const empty = { bounds, commands: [] };
  return {
    layoutSnapshot,
    interactionSnapshot: buildQuireRenderInteractionSnapshot({ layoutSnapshot, selectionGeometry: { carets: [], ranges: [] },
      decorationLane, domOverlays: [] }),
    displayOwnerIndex,
    displayInvalidation,
    displayOwnerChunks,
    displayOwnerDiagnostics: createQuireRetainedDisplayOwnerDiagnostics({ ownerIndex: displayOwnerIndex,
      ownerChunkCount: displayOwnerChunks.chunks.length, invalidation: displayInvalidation, observerBridgeUses: 0 }),
    selectionGeometry: { carets: [], ranges: [] },
    decorationLane,
    displayList: empty,
    contentDisplayList: empty,
    overlayDisplayList: empty,
    domOverlays: [],
    viewTargets: []
  } as unknown as QuireViewRenderResult;
}

/**
 * @param list - Display list.
 * @returns Top-level command ids other than selection highlights and carets.
 */
function commandIds(list: QuireDisplayList): readonly string[] {
  return list.commands.map((command) => command.id!).filter((id) => !id.startsWith("selection") && !id.startsWith("caret"));
}
