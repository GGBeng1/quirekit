import { describe, expect, it, vi } from "vitest";
import { compileQuireViewNode, type QuireViewNode } from "@quirekit/renderer";
import { quireNeutralDocumentProfile } from "../../../../../document-profile/defaults";
import type { QuireDrawingObject } from "../../../../../document-profile/types";
import { createQuireDrawingObjectSourceCapabilityResolver } from "./object";

/** @returns Independent embedding object with no document-specific registry or node names. */
function embedding(): QuireDrawingObject {
  return {
    objectId: "embedding", storyId: null,
    drawing: {
      drawingId: "drawing", kind: "embedded", embedded: { contentId: "content" },
      extent: { width: 160, height: 90 },
      transform: { rotation: 0, flipHorizontal: false, flipVertical: false, lockAspectRatio: true },
      appearance: { fill: { kind: "none", color: null, opacity: 1 },
        stroke: { kind: "none", color: null, width: 0, opacity: 1, dash: "solid" } },
      textBody: null, picture: null
    },
    placement: {
      objectId: "embedding", extent: { inlineSize: 160, blockSize: 90 }, layoutMode: "inline",
      anchorMovement: "move-with-text", inlinePlacement: { kind: "offset", reference: "anchor", offset: 0 },
      blockPlacement: { kind: "offset", reference: "line", offset: 0 }, flowExclusion: { kind: "none" },
      paintOrder: "above-content", stackingOrder: 0, allowOverlap: true, constrainToRegion: false,
      lockAspectRatio: true, storyId: null
    },
    embeddedPresentation: { label: "Prepared embedding", signature: "revision-1", resourceKey: "quirekit-media:asset:prepared" }
  };
}

describe("neutral embedded drawing products", () => {
  it("exposes eight resize handles only for an explicitly authorized embedding", () => {
    const object = embedding();
    const resolver = createQuireDrawingObjectSourceCapabilityResolver("independent-anchor", {
      ...quireNeutralDocumentProfile.drawingModel,
      readObject: () => ({ ...object, embeddedPresentation: { ...object.embeddedPresentation!, resizePolicy: {
        minimumExtent: { width: 120, height: 120 }, maximumExtent: { width: 2000, height: 2000 }, extentStep: 1, preserveOrigin: true
      } } })
    });
    const result = resolver.resolve({ nodeType: "independent-anchor", attrs: {} });
    if (result.status !== "resolved") throw new Error("Expected an embedding product.");
    const selected = compileQuireViewNode({ id: "selected", node: buildSelectedView(result.presentation.selectedView), origin: { x: 0, y: 0 },
      constraints: { minWidth: 160, maxWidth: 160, minHeight: 90, maxHeight: 90 } });
    const targets = selected.targets.filter(target => Object.keys(target.events).length > 0);
    expect(targets).toHaveLength(8);
    expect(targets.every(target => target.role === "resize-handle")).toBe(true);
    expect(result.presentation.selectedViewVisualOverflow).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });
  it("forwards opaque document identity and paints the exact accepted image rectangle", () => {
    const document = Object.freeze({ revision: "opaque" });
    const object = embedding(), readObject = vi.fn(() => object);
    const resolver = createQuireDrawingObjectSourceCapabilityResolver("independent-anchor",
      { ...quireNeutralDocumentProfile.drawingModel, readObject }, { document });
    const result = resolver.resolve({ nodeType: "independent-anchor", attrs: { independent: true } });
    expect(readObject).toHaveBeenCalledWith({ independent: true }, document);
    if (result.status !== "resolved") throw new Error("Expected an embedding product.");
    const input = { origin: { x: 24, y: 40 }, constraints: { minWidth: 160, maxWidth: 160, minHeight: 90, maxHeight: 90 } };
    const compiled = compileQuireViewNode({ ...input, id: "embedding", node: result.presentation.view });
    expect(compiled.displayList.commands.filter((command) => command.kind === "image")).toEqual([
      { id: "embedding:0.0", kind: "image", rect: { x: 24, y: 40, width: 160, height: 90 }, resourceKey: "quirekit-media:asset:prepared" }
    ]);
    expect(result.presentation.presentationSignature).toContain("revision-1");
    const selected = compileQuireViewNode({ ...input, id: "selected", node: buildSelectedView(result.presentation.selectedView) });
    expect(selected.targets.every((target) => target.pointerEvents === "none" && Object.keys(target.events).length === 0)).toBe(true);
    expect(result.presentation.selectedViewVisualOverflow).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
  });

  it("shows the independent owner's explanation when no image is prepared", () => {
    const object = embedding();
    const resolver = createQuireDrawingObjectSourceCapabilityResolver("independent-anchor", {
      ...quireNeutralDocumentProfile.drawingModel,
      readObject: () => ({ ...object, embeddedPresentation: { label: "Source preserved", signature: "pending" } })
    });
    const result = resolver.resolve({ nodeType: "independent-anchor", attrs: {} });
    if (result.status !== "resolved") throw new Error("Expected a placeholder product.");
    expect(result.presentation.view).toMatchObject({ child: { kind: "text", text: "Source preserved" } });
  });
});

/**
 * Builds selected chrome from a presentation that may supply it lazily.
 *
 * @param selectedView - Node or factory declared by the resolver.
 * @returns Selected chrome view tree.
 */
function buildSelectedView(selectedView: QuireViewNode | (() => QuireViewNode) | undefined): QuireViewNode {
  if (selectedView === undefined) throw new Error("Expected selected chrome.");
  return typeof selectedView === "function" ? selectedView() : selectedView;
}
