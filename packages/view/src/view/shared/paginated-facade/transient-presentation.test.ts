import type { QuireDrawingManipulatingState } from "@quirekit/view-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { MountedPaginatedDrawingPreviewPresentation } from "./drawing-preview-presentation";
import { createMountedPaginatedTransientPresentation } from "./transient-presentation";
import type { CreateMountedPaginatedTransientPresentationOptions } from "./types";

const doubles = vi.hoisted(() => ({
  projectDrawingPreview: vi.fn()
}));

vi.mock("../render-result", () => ({
  canReuseMountedSelectionOverlayRenderResult: vi.fn(() => false),
  createMountedDrawingPreviewRenderResult: doubles.projectDrawingPreview,
  createMountedSelectionUpdateRenderResult: vi.fn()
}));

describe("mounted paginated transient presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("repaints content for move frames and move cancellation", () => {
    const renderResult = {} as QuireViewRenderResult;
    const repaintDrawingPreview = vi.fn();
    const repaintOverlay = vi.fn();
    const frames = createTestFrameScheduler();
    doubles.projectDrawingPreview.mockReturnValue(renderResult);
    const presentation = createMountedPaginatedTransientPresentation(
      createOptions(renderResult, repaintDrawingPreview, repaintOverlay, frames)
    );

    presentation.setDrawingPreview(createState("moving", "move"));
    frames.flush();
    presentation.setDrawingPreview(null);

    expect(repaintDrawingPreview).toHaveBeenCalledTimes(2);
    expect(repaintDrawingPreview).toHaveBeenNthCalledWith(1, renderResult, true);
    expect(repaintDrawingPreview).toHaveBeenNthCalledWith(2, renderResult, true);
    expect(repaintOverlay).not.toHaveBeenCalled();
    presentation.destroy();
  });

  it("repaints drawing content for resize surface frames and cancellation", () => {
    const renderResult = {} as QuireViewRenderResult;
    const repaintDrawingPreview = vi.fn();
    const repaintOverlay = vi.fn();
    const frames = createTestFrameScheduler();
    doubles.projectDrawingPreview.mockReturnValue(renderResult);
    const presentation = createMountedPaginatedTransientPresentation(
      createOptions(renderResult, repaintDrawingPreview, repaintOverlay, frames)
    );

    presentation.setDrawingPreview(createState("resizing", "resize"));
    frames.flush();
    presentation.setDrawingPreview(null);

    expect(repaintDrawingPreview).toHaveBeenCalledTimes(2);
    expect(repaintDrawingPreview).toHaveBeenNthCalledWith(1, renderResult, true);
    expect(repaintDrawingPreview).toHaveBeenNthCalledWith(2, renderResult, true);
    expect(repaintOverlay).not.toHaveBeenCalled();
    presentation.destroy();
  });

  it("derives repeated layout previews from one accepted result and restores it", () => {
    const accepted = { layoutSnapshot: { id: "accepted" } } as unknown as QuireViewRenderResult;
    const firstPreview = { layoutSnapshot: { id: "preview-1" } } as unknown as QuireViewRenderResult;
    const secondPreview = { layoutSnapshot: { id: "preview-2" } } as unknown as QuireViewRenderResult;
    let current = accepted;
    const commitRenderResult = vi.fn((result: QuireViewRenderResult) => {
      current = result;
    });
    const buildDrawingLayoutPreview = vi.fn()
      .mockReturnValueOnce(firstPreview)
      .mockReturnValueOnce(secondPreview);
    const repaintDrawingPreview = vi.fn();
    const frames = createTestFrameScheduler();
    const options = createOptions(
      accepted,
      repaintDrawingPreview,
      vi.fn(),
      frames
    );
    const presentation = createMountedPaginatedTransientPresentation({
      ...options,
      readRenderResult: () => current,
      commitRenderResult,
      buildDrawingLayoutPreview
    });

    presentation.setDrawingPreview(createState("moving", "move"));
    frames.flush();
    presentation.setDrawingPreview(createState("moving", "move"));
    frames.flush();
    presentation.setDrawingPreview(null);

    expect(buildDrawingLayoutPreview).toHaveBeenCalledTimes(2);
    expect(buildDrawingLayoutPreview.mock.calls[0]?.[1]).toBe(accepted);
    expect(buildDrawingLayoutPreview.mock.calls[1]?.[1]).toBe(accepted);
    expect(commitRenderResult.mock.calls.map(([result]) => result)).toEqual([
      firstPreview,
      secondPreview,
      accepted
    ]);
    expect(repaintDrawingPreview).toHaveBeenLastCalledWith(accepted, true);
    presentation.destroy();
  });

  it("coalesces repeated pointer updates to the latest display frame", () => {
    const accepted = { layoutSnapshot: { id: "accepted" } } as unknown as QuireViewRenderResult;
    const latestPreview = { layoutSnapshot: { id: "latest" } } as unknown as QuireViewRenderResult;
    const frames = createTestFrameScheduler();
    const buildDrawingLayoutPreview = vi.fn(() => latestPreview);
    const presentation = createMountedPaginatedTransientPresentation({
      ...createOptions(accepted, vi.fn(), vi.fn(), frames),
      buildDrawingLayoutPreview
    });
    const first = createState("moving", "move");
    const latest = {
      ...first,
      track: {
        ...first.track,
        currentPoint: { x: 24, y: 32 }
      }
    };

    presentation.setDrawingPreview(first);
    presentation.setDrawingPreview(latest);

    expect(buildDrawingLayoutPreview).not.toHaveBeenCalled();
    expect(frames.pending()).toBe(1);
    frames.flush();
    expect(buildDrawingLayoutPreview).toHaveBeenCalledTimes(1);
    expect(buildDrawingLayoutPreview).toHaveBeenCalledWith(latest, accepted);
    presentation.destroy();
  });

  it("cancels an unpainted preview without running its queued callback", () => {
    const accepted = { layoutSnapshot: { id: "accepted" } } as unknown as QuireViewRenderResult;
    const frames = createTestFrameScheduler();
    const commitRenderResult = vi.fn();
    const presentation = createMountedPaginatedTransientPresentation({
      ...createOptions(accepted, vi.fn(), vi.fn(), frames),
      commitRenderResult
    });

    presentation.setDrawingPreview(createState("moving", "move"));
    presentation.setDrawingPreview(null);
    frames.flush();

    expect(commitRenderResult).not.toHaveBeenCalled();
    expect(frames.pending()).toBe(0);
    presentation.destroy();
  });

  it("invalidates queued speculative work after an authoritative full render", () => {
    const accepted = { layoutSnapshot: { id: "accepted" } } as unknown as QuireViewRenderResult;
    const frames = createTestFrameScheduler();
    const buildDrawingLayoutPreview = vi.fn();
    const presentation = new MountedPaginatedDrawingPreviewPresentation(
      {
        ...createOptions(accepted, vi.fn(), vi.fn(), frames),
        buildDrawingLayoutPreview
      },
      () => true
    );

    presentation.set(createState("resizing", "resize"));
    presentation.syncAfterRender();
    frames.flush();

    expect(buildDrawingLayoutPreview).not.toHaveBeenCalled();
    expect(frames.pending()).toBe(0);
    presentation.destroy();
  });

  it("preserves an explicit retained-target cursor across render commits", () => {
    const renderResult = { domOverlays: [] } as unknown as QuireViewRenderResult;
    const frames = createTestFrameScheduler();
    const pointerSurface = { style: { cursor: "pointer" } } as HTMLElement;
    const presentation = createMountedPaginatedTransientPresentation({
      ...createOptions(renderResult, vi.fn(), vi.fn(), frames),
      overlayHost: { querySelectorAll: () => [] } as unknown as HTMLElement,
      readPointerSurface: () => pointerSurface
    });

    presentation.syncAfterRender();

    expect(pointerSurface.style.cursor).toBe("pointer");
    presentation.destroy();
  });

  it("clears an explicit retained-target cursor when editing becomes locked", () => {
    const renderResult = { domOverlays: [] } as unknown as QuireViewRenderResult;
    const frames = createTestFrameScheduler();
    const pointerSurface = { style: { cursor: "pointer" } } as HTMLElement;
    const presentation = createMountedPaginatedTransientPresentation({
      ...createOptions(renderResult, vi.fn(), vi.fn(), frames),
      overlayHost: { querySelectorAll: () => [] } as unknown as HTMLElement,
      readEditable: () => false,
      readPointerSurface: () => pointerSurface
    });

    presentation.syncAfterRender();

    expect(pointerSurface.style.cursor).toBe("");
    presentation.destroy();
  });
});

/**
 * Creates the minimum stable backend capabilities used by preview tests.
 *
 * @param renderResult - Current and projected render authority.
 * @param repaintDrawingPreview - Content-plus-chrome repaint spy.
 * @param repaintOverlay - Overlay-only repaint spy.
 * @param frames - Deterministic animation-frame scheduler.
 * @returns Transient presentation options.
 */
function createOptions(
  renderResult: QuireViewRenderResult,
  repaintDrawingPreview: ReturnType<typeof vi.fn>,
  repaintOverlay: ReturnType<typeof vi.fn>,
  frames: ReturnType<typeof createTestFrameScheduler>
): CreateMountedPaginatedTransientPresentationOptions {
  return {
    ownerDocument: {} as Document,
    overlayHost: {} as HTMLElement,
    domCaretClassName: "caret",
    caretRendering: "overlay",
    caretMode: "hidden",
    readRenderResult: () => renderResult,
    commitRenderResult: vi.fn(),
    readState: vi.fn(),
    readSelectionContext: vi.fn(),
    readFocused: () => false,
    readEditable: () => true,
    readDestroyed: () => false,
    setFocusedState: vi.fn(),
    readPointerSurface: () => ({ style: {} }) as HTMLElement,
    isSelectionUpdateReady: () => true,
    setWidgetTargets: vi.fn(),
    syncInputProxy: vi.fn(),
    repaintOverlay,
    repaintDrawingPreview,
    requestDrawingPreviewFrame: frames.request,
    cancelDrawingPreviewFrame: frames.cancel
  } as unknown as CreateMountedPaginatedTransientPresentationOptions;
}

/**
 * Creates a deterministic cancelable frame queue for preview cadence tests.
 *
 * @returns Frame hooks plus flush and pending-count controls.
 */
function createTestFrameScheduler() {
  let nextHandle = 1;
  const callbacks = new Map<number, () => void>();

  return {
    /** Requests one callback in the deterministic queue. */
    request(callback: () => void): number {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    /** Cancels one queued callback by handle. */
    cancel(handle: number): void {
      callbacks.delete(handle);
    },
    /** Executes every callback currently waiting for a frame. */
    flush(): void {
      const pendingCallbacks = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pendingCallbacks) {
        callback();
      }
    },
    /** @returns Number of callbacks still waiting for a frame. */
    pending(): number {
      return callbacks.size;
    }
  };
}

/**
 * Creates one active drawing manipulation state.
 *
 * @param kind - Controller state discriminator.
 * @param trackKind - Transient operation family.
 * @returns Active manipulation state.
 */
function createState(
  kind: "moving" | "resizing",
  trackKind: "move" | "resize"
): QuireDrawingManipulatingState {
  return {
    kind,
    identity: {
      objectId: "object",
      drawingId: "drawing",
      rootId: "root",
      regionId: "region",
      visualInstanceId: "single",
      sourceRevision: 0
    },
    pointer: {
      pointerId: 1,
      clientPoint: { x: 0, y: 0 },
      point: { x: 0, y: 0 }
    },
    track: {
      kind: trackKind,
      startFrame: {
        rect: { x: 10, y: 20, width: 30, height: 40 },
        rotation: 0
      },
      previewFrame: {
        rect: { x: 20, y: 30, width: 30, height: 40 },
        rotation: 0
      },
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 10, y: 10 }
    },
    lockAspectRatio: false,
    ...(kind === "resizing" ? { handle: "south-east" as const } : {})
  };
}
