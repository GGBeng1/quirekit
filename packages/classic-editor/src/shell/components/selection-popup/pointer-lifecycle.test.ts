// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindClassicEditorSelectionPopupPointerLifecycle } from "./pointer-lifecycle";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Classic Editor selection Popup Menu pointer lifecycle", () => {
  it("gates range handles outside the View until their matching release", async () => {
    const { root } = createFixture();
    const handles = document.createElement("div");
    handles.className = "qk-classic-editor__touch-selection";
    const grip = document.createElement("button");
    handles.append(grip);
    root.append(handles);
    const start = vi.fn(), end = vi.fn();
    const release = bindClassicEditorSelectionPopupPointerLifecycle(root, start, end);
    grip.dispatchEvent(createPointerEvent("pointerdown", 9));
    expect(start).toHaveBeenCalledOnce();
    document.dispatchEvent(createPointerEvent("pointerup", 9));
    await Promise.resolve();
    expect(end).toHaveBeenCalledExactlyOnceWith(true);
    release();
  });

  it("releases a document selection only after matching pointerup dispatch", async () => {
    const { root, surface } = createFixture();
    const start = vi.fn();
    const end = vi.fn();
    const release = bindClassicEditorSelectionPopupPointerLifecycle(root, start, end);

    surface.dispatchEvent(createPointerEvent("pointerdown", 7));
    expect(start).toHaveBeenCalledOnce();
    expect(end).not.toHaveBeenCalled();

    document.dispatchEvent(createPointerEvent("pointerup", 8));
    await Promise.resolve();
    expect(end).not.toHaveBeenCalled();

    document.dispatchEvent(createPointerEvent("pointerup", 7));
    expect(end).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(end).toHaveBeenCalledExactlyOnceWith(true);
    release();
  });

  it("ignores overlay actions and reports cancellation without reopening", async () => {
    const { root, overlayAction, surface } = createFixture();
    const start = vi.fn();
    const end = vi.fn();
    const release = bindClassicEditorSelectionPopupPointerLifecycle(root, start, end);

    overlayAction.dispatchEvent(createPointerEvent("pointerdown", 3));
    expect(start).not.toHaveBeenCalled();

    surface.dispatchEvent(createPointerEvent("pointerdown", 4));
    document.dispatchEvent(createPointerEvent("pointercancel", 4));
    await Promise.resolve();
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledExactlyOnceWith(false);
    release();
  });

  it("invalidates queued completion when the owner unmounts", async () => {
    const { root, surface } = createFixture();
    const end = vi.fn();
    const release = bindClassicEditorSelectionPopupPointerLifecycle(
      root,
      vi.fn(),
      end
    );

    surface.dispatchEvent(createPointerEvent("pointerdown", 2));
    document.dispatchEvent(createPointerEvent("pointerup", 2));
    release();
    await Promise.resolve();
    expect(end).not.toHaveBeenCalled();
  });
});

/** @returns Product root with document and overlay pointer targets. */
function createFixture(): {
  readonly root: HTMLElement;
  readonly surface: HTMLElement;
  readonly overlayAction: HTMLButtonElement;
} {
  const root = document.createElement("section");
  const view = document.createElement("div");
  const surface = document.createElement("canvas");
  const overlays = document.createElement("div");
  const overlayAction = document.createElement("button");
  view.dataset.qkView = "canvas";
  surface.dataset.qkSurface = "content";
  overlays.dataset.qkOverlays = "";
  overlays.append(overlayAction);
  view.append(surface, overlays);
  root.append(view);
  document.body.append(root);
  return { root, surface, overlayAction };
}

/**
 * Creates one deterministic PointerEvent for the selection gesture fixture.
 *
 * @param type - Pointer lifecycle event type.
 * @param pointerId - Pointer identity shared by one gesture.
 * @returns Bubbling primary-button pointer event.
 */
function createPointerEvent(
  type: "pointerdown" | "pointerup" | "pointercancel",
  pointerId: number
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    button: type === "pointerdown" ? 0 : -1,
    pointerId
  });
}
