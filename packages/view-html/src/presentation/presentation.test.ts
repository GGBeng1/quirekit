import { createEditor } from "@quirekit/core";
import { DecorationSet } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlMountedViewElements } from "../dom";
import type { HtmlMountedView, HtmlMountedRenderDiagnostics } from "../types";
import { createHtmlContinuousFlowPresentation } from "./presentation";
import * as hitRegions from "../measurement/hit/regions";

describe("HtmlContinuousFlowPresentation", () => {
  it("owns the ordered retained DOM pipeline and destroys it once", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Alpha" }]
          }
        ]
      }
    });
    const elements = createHtmlMountedViewElements({
      editor,
      id: "html-presentation",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180 }
    });
    const renderPhases: string[][] = [];
    const renderWork: HtmlMountedRenderDiagnostics[] = [];
    const buildHitTree = vi.spyOn(hitRegions, "createHtmlBlockHitTree");
    const setViewTargets = vi.fn();
    const mountedView = {
      id: "html-presentation",
      mode: "html",
      status: "primary",
      editable: true,
      elements,
      get state() {
        return editor.state.pm;
      },
      someProp: () => undefined
    } as unknown as HtmlMountedView;
    const presentation = createHtmlContinuousFlowPresentation({
      id: "html-presentation",
      mountedView,
      editor,
      elements,
      runtime: {
        width: 320,
        height: 180,
        onRender(event) {
          renderPhases.push(event.phases?.map((phase) => phase.name) ?? []);
          renderWork.push(event.diagnostics);
        }
      },
      getSelectionGeometryContext: () => undefined,
      focusDocumentInput: vi.fn(),
      hasFocus: () => false,
      isDestroyed: () => false,
      setDocumentFocused: vi.fn(),
      setViewTargets,
      requestDeferredPostUpdate: vi.fn(),
      completeDeferredPostUpdate: vi.fn(),
      resolveDecorationSource: () => DecorationSet.empty
    });

    presentation.render({ editor, reason: "initial" });

    expect(renderPhases).toEqual([
      ["content-write", "geometry-read", "overlay-write"]
    ]);
    expect(presentation.getRenderState()).not.toBeNull();
    expect(elements.contentSurface.children).toHaveLength(1);
    expect(setViewTargets).toHaveBeenCalledTimes(1);

    for (const position of [2, 4, 1]) {
      editor.commands.setTextSelection(position);
      presentation.render({ editor, reason: "selection" });
    }
    expect(buildHitTree).toHaveBeenCalledTimes(1);
    expect(renderWork).toHaveLength(4);
    for (const work of renderWork.slice(1)) {
      expect(work.flowGeometryRebuilt).toBe(false);
      expect(work.descriptorVisits).toBe(0);
      expect(work.contentWrites).toEqual({ text: 0, attributes: 0, structure: 0, composition: 0 });
    }
    buildHitTree.mockRestore();

    const destroyDocumentView = vi.spyOn(presentation.documentView, "destroy");
    presentation.destroy();
    presentation.destroy();

    expect(destroyDocumentView).toHaveBeenCalledTimes(1);
    expect(presentation.documentView.root.destroyed).toBe(true);
  });
});
