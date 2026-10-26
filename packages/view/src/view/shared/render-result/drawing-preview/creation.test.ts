import { createEditor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import type { QuireDisplayCommand, QuireDisplayList } from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import type { QuireDrawingCreatingState, QuireRetainedLayerContribution } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import type { QuireViewRenderResult } from "../../../types";
import { createMountedDrawingCreationPreviewRenderResult } from "./creation";

describe("drawing creation preview", () => {
  it("suppresses and restores only the selected drawing's chrome", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] }
    });
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(NodeSelection.create(editor.state.doc, 0)));
    const selected = createChrome("selected", { from: 0, to: 2 });
    const unselected = createChrome("unselected", { from: 2, to: 4 });
    const label = createCommand("persistent-label");
    const accepted = createRenderResult(editor.state, [selected, unselected], [selected.commands[0]!, label]);

    const creating = createMountedDrawingCreationPreviewRenderResult({ previousRenderResult: accepted, state: creatingState, active: true });
    expect(commandIds(creating.overlayDisplayList)).toEqual(["persistent-label"]);

    const restored = createMountedDrawingCreationPreviewRenderResult({ previousRenderResult: creating, state: creatingState, active: false });
    expect(commandIds(restored.overlayDisplayList)).toEqual(["persistent-label", "selected:chrome"]);
  });
});

/** Pressed creation gesture: it suppresses accepted chrome before any provisional geometry paints. */
const creatingState: QuireDrawingCreatingState = {
  kind: "creating",
  identity: { objectId: "new", drawingId: "new-drawing", rootId: "root:document", regionId: "region:page:0",
    visualInstanceId: "page:0", sourceRevision: "create:new" },
  drawingKind: "horizontal-text-box",
  pointer: { pointerId: 1, clientPoint: { x: 10, y: 10 }, point: { x: 10, y: 10 } },
  defaultExtent: { width: 73, height: 52 },
  track: {
    kind: "create",
    startFrame: { rect: { x: 10, y: 10, width: 73, height: 52 }, rotation: 0 },
    previewFrame: { rect: { x: 10, y: 10, width: 120, height: 60 }, rotation: 0 },
    startPoint: { x: 10, y: 10 },
    currentPoint: { x: 130, y: 70 }
  },
  dragged: false
};

/**
 * @param id - Command id.
 * @returns Overlay rectangle command.
 */
function createCommand(id: string): QuireDisplayCommand {
  return { id, kind: "fill-rect", layer: "overlay", rect: { x: 0, y: 0, width: 10, height: 10 }, fillStyle: "#2563eb" };
}

/**
 * @param id - Drawing identity.
 * @param range - Drawing node range that activates the chrome.
 * @returns Selected-owner chrome contribution with one command.
 */
function createChrome(id: string, range: { readonly from: number; readonly to: number }): QuireRetainedLayerContribution {
  return {
    contributionId: `selection:${id}`,
    range,
    rect: { x: 0, y: 0, width: 10, height: 10 },
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    activation: { kind: "selected-owner" },
    commands: [createCommand(`${id}:chrome`)],
    domOverlays: [],
    targets: []
  } as unknown as QuireRetainedLayerContribution;
}

/**
 * @param state - Editor state whose selection activates chrome.
 * @param contributions - Snapshot layer contributions.
 * @param overlay - Painted overlay commands.
 * @returns Accepted composite render result.
 */
function createRenderResult(
  state: QuireViewRenderResult["layoutSnapshot"]["state"],
  contributions: readonly QuireRetainedLayerContribution[],
  overlay: readonly QuireDisplayCommand[]
): QuireViewRenderResult {
  const bounds = { x: 0, y: 0, width: 400, height: 400 };
  return {
    layoutSnapshot: { state, documentRect: bounds, layerContributions: contributions },
    contentDisplayList: { bounds, commands: [] },
    overlayDisplayList: { bounds, commands: overlay },
    displayList: { bounds, commands: overlay }
  } as unknown as QuireViewRenderResult;
}

/**
 * @param list - Display list.
 * @returns Top-level command ids.
 */
function commandIds(list: QuireDisplayList): readonly string[] {
  return list.commands.map(command => command.id!);
}
