import { createEditor } from "@quirekit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import { createCanvasMountedView } from "../mount";
import * as pageStackRendering from "./page-stack-rendering";
import * as rendering from "./rendering";

afterEach(() => vi.restoreAllMocks());

describe("Canvas mounted orchestration lifetime", () => {
  it.each([false, true])("retains live context across renders (pageStack=%s)", (pageStack) => {
    const render = pageStack
      ? vi.spyOn(pageStackRendering, "renderCanvasMountedPageStack")
      : vi.spyOn(rendering, "renderCanvasMountedSingleSurface");
    const repaint = vi.spyOn(pageStackRendering, "repaintCanvasMountedOverlay");
    const ownerDocument = new FakeCanvasMountDocument();
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }]
      }
    });
    const view = createCanvasMountedView({
      editor,
      id: "retained-orchestration",
      status: "primary",
      element: ownerDocument.createElement("section") as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: {
        width: 320,
        height: 180,
        pageStack,
        caretRendering: "overlay",
        ...(pageStack ? {
          pageGeometry: {
            pageRect: { x: 0, y: 0, width: 320, height: 180 },
            bodyRect: { x: 20, y: 20, width: 280, height: 140 }
          }
        } : {})
      }
    });
    try {
      const context = render.mock.calls[0]![0];
      const initialResult = context.readRenderResult();
      const initialSurface = context.readSurfaceState();
      const initialRevision = context.readCurrentRevision();
      expect(context.readPageStackPresentation() !== undefined).toBe(pageStack);
      expect(context.isDestroyed()).toBe(false);

      editor.dispatchTransaction(editor.state.pm.tr.insertText("d", 2));
      view.update({ editor, reason: "transaction" });
      view.update({ editor, reason: "resize" });
      view.setHiddenTextViewMode("formatting-inspection");
      view.focus();
      view.setCaretMode("hidden");

      expect(render.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(render.mock.calls.every(([current]) => current === context)).toBe(true);
      expect(repaint).toHaveBeenCalled();
      expect(repaint.mock.calls.every(([current]) => current === context)).toBe(true);
      expect(context.readRenderResult()).not.toBe(initialResult);
      expect(context.readRenderResult()?.layoutSnapshot.state).toBe(editor.state);
      expect(context.readSurfaceState()).not.toBe(initialSurface);
      expect(context.readCurrentRevision().stateVersion).toBeGreaterThan(initialRevision.stateVersion);
      expect(context.runtime.hiddenTextViewMode).toBe("formatting-inspection");
      view.destroy();
      expect(context.isDestroyed()).toBe(true);
    } finally {
      view.destroy();
      editor.destroy();
    }
  });
});
