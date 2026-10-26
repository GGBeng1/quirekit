import { createEditor, Extension } from "@quirekit/core";
import { Transform } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import type { QuirePresentationOverlay } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "../../../test-support/mount/svg";
import type {} from "../../mounted-services/augmentation";
import type { QuireMountedServiceContext } from "../../mounted-services/types";
import type { QuireMountedViewRenderEvent } from "../types";
import { createSvgMountedView } from "./mount";

/** Pending animation-frame callbacks driven explicitly by the test. */
function createFrameHarness() {
  const callbacks = new Map<number, () => void>();
  let next = 1;
  return {
    request: (callback: () => void) => { callbacks.set(next, callback); return next++; },
    cancel: (handle: number) => { callbacks.delete(handle); },
    pendingCount: () => callbacks.size,
    runAll: () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback();
    }
  };
}

/**
 * Mounts an SVG view whose mounted service exposes its context to the test.
 *
 * @returns Editor, view, captured context, frame harness and render events.
 */
function mountWithService() {
  let context: QuireMountedServiceContext | undefined;
  const editor = createEditor({
    extensions: [
      StarterKit,
      Extension.create({
        name: "overlayProbe",
        addMountedViewServices: () => [{
          id: "overlay-probe",
          create: (serviceContext) => {
            context = serviceContext;
            return { destroy() {} };
          }
        }]
      })
    ],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] }
  });
  const ownerDocument = new FakeSvgMountDocument();
  const frame = createFrameHarness();
  const renders: QuireMountedViewRenderEvent[] = [];
  const view = createSvgMountedView({
    editor,
    id: "overlay-svg-view",
    status: "primary",
    element: ownerDocument.createElement("section") as unknown as HTMLElement,
    ownerDocument: ownerDocument as unknown as Document,
    runtime: {
      width: 480,
      height: 240,
      requestUpdateFrame: frame.request,
      cancelUpdateFrame: frame.cancel,
      onRender: (event) => renders.push(event)
    }
  });
  if (context === undefined) throw new Error("mounted service was not created");
  return { editor, view, context, frame, renders };
}

/**
 * Plans "Hello world" → "Hello worldthere" with the new text marked inserted.
 *
 * @param editor - Mounted editor.
 * @param text - Inserted text.
 * @returns Overlay against the current document.
 */
function insertOverlay(editor: ReturnType<typeof createEditor>, text: string): QuirePresentationOverlay {
  const baseDoc = editor.state.doc;
  return {
    baseDoc,
    steps: new Transform(baseDoc).insert(12, editor.schema.text(text)).steps,
    ranges: [{ from: 12, to: 12 + text.length, role: "inserted" }]
  };
}

describe("mounted presentation overlay", () => {
  it("coalesces overlay updates into one frame and leaves the editor state untouched", () => {
    const { editor, view, context, frame, renders } = mountWithService();
    const committed = editor.state;
    renders.length = 0;

    expect(context.presentOverlay(insertOverlay(editor, "t"))).toBe(true);
    expect(context.presentOverlay(insertOverlay(editor, "there"))).toBe(true);
    expect(renders).toHaveLength(0);
    expect(frame.pendingCount()).toBe(1);

    frame.runAll();

    expect(renders.map((event) => event.reason)).toEqual(["presentation-overlay"]);
    expect(renders[0]!.renderResult.layoutSnapshot.state.doc.textContent).toBe("Hello worldthere");
    expect(editor.state).toBe(committed);
    view.destroy();
  });

  it("keeps the overlay across selection renders and drops it when cleared", () => {
    const { editor, view, context, frame, renders } = mountWithService();
    context.presentOverlay(insertOverlay(editor, "there"));
    frame.runAll();

    renders.length = 0;
    editor.commands.setTextSelection(3);
    view.update({ editor, reason: "selection" });
    frame.runAll();
    expect(renders.map((event) => event.reason)).toEqual(["selection"]);
    expect(renders.at(-1)!.renderResult.layoutSnapshot.state.doc.textContent).toBe("Hello worldthere");

    context.presentOverlay(null);
    frame.runAll();
    expect(renders.at(-1)!.renderResult.layoutSnapshot.state.doc).toBe(editor.state.doc);
    view.destroy();
  });

  it("stops rendering an overlay once the canonical document changes", () => {
    const { editor, view, context, frame, renders } = mountWithService();
    context.presentOverlay(insertOverlay(editor, "there"));
    frame.runAll();

    editor.commands.insertContentAt(1, "Say ");
    view.update({ editor, reason: "transaction" });
    frame.runAll();

    expect(renders.at(-1)!.renderResult.layoutSnapshot.state.doc).toBe(editor.state.doc);
    view.destroy();
  });
});
