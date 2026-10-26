import { DragSession } from "@quirekit/editor-ui";
import type { EditorUIDragUpdateInput } from "@quirekit/editor-ui";
import { bindMountedPointerDragDocumentEvents } from "../../../pointer/drag";
import { createBlockSourceSelection } from "../fixture";

/** Browser result proving real event lifecycle cleanup and typed commit. */
export interface BrowserDragLifecycleResult {
  /** Terminal phase after owner pointerup. */
  readonly committedPhase: string;
  /** Number of typed intents emitted by one pointerup. */
  readonly intentCount: number;
  /** Terminal cancellation reason after a real Escape key event. */
  readonly escapeReason: string | undefined;
}

/**
 * Runs the headless drag session through real pointer and keyboard events.
 *
 * @returns Terminal commit and cancellation observations.
 */
export function runDragLifecycleFixture(): BrowserDragLifecycleResult {
  const intents: unknown[] = [];
  const binding = createBrowserBinding(() => intents.push(true));
  binding.session.arm(createBrowserArmInput());
  document.dispatchEvent(createPointerEvent("pointermove", 8));
  document.dispatchEvent(createPointerEvent("pointerup", 9));
  const committedPhase = binding.session.state.phase;

  const escapeBinding = createBrowserBinding(() => {});
  escapeBinding.session.arm(createBrowserArmInput());
  document.dispatchEvent(createPointerEvent("pointermove", 8));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  const escapeState = escapeBinding.session.state;
  escapeBinding.destroy();

  return {
    committedPhase,
    intentCount: intents.length,
    escapeReason: escapeState.phase === "cancelled" ? escapeState.reason : undefined
  };
}

/**
 * Creates one mounted binding over real browser event targets.
 *
 * @param onIntent - Typed-intent observation callback.
 * @returns Browser-mounted command-neutral binding.
 */
function createBrowserBinding(onIntent: () => void) {
  let releaseListeners = (): void => {};
  const session = new DragSession({
    threshold: 5,
    resolveTarget: () => ({
      status: "ready" as const,
      snapshotVersion: 7,
      identity: { rootId: "body", nodeId: "target" },
      placement: "before" as const,
      indicator: {
        kind: "line" as const,
        coordinateSpace: "document" as const,
        snapshotVersion: 7,
        placement: "before" as const,
        rect: { x: 40, y: 100, width: 200, height: 0 },
        sourceTargetIds: ["node:target"]
      },
      payload: { targetPosition: 20 }
    }),
    listeners: { release: () => releaseListeners() }
  });
  const handlePointerMove = (event: PointerEvent): void => {
    if (resolveActivePointerId(session) !== event.pointerId) return;
    session.update(createBrowserUpdate(event));
  };
  const handlePointerEnd = (event: PointerEvent): void => {
    if (resolveActivePointerId(session) !== event.pointerId) return;
    if (event.type === "pointercancel") {
      session.cancel("pointer-cancel");
      return;
    }
    const update = createBrowserUpdate(event);
    session.update(update);
    const result = session.drop({
      pointerId: event.pointerId,
      snapshotVersion: update.snapshotVersion
    });
    if (result.status === "committed") onIntent();
  };
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!session.handleKey({ key: event.key, isComposing: event.isComposing })) return;
    event.preventDefault();
  };
  const handleBlur = (): void => {
    if (resolveActivePointerId(session) !== undefined) session.cancel("window-blur");
  };
  const releasePointerListeners = bindMountedPointerDragDocumentEvents({
    ownerDocument: document,
    handlePointerMove,
    handlePointerEnd
  });
  document.addEventListener("keydown", handleKeyDown, { capture: true });
  window.addEventListener("blur", handleBlur, { capture: true });
  let released = false;
  releaseListeners = (): void => {
    if (released) return;
    released = true;
    releasePointerListeners();
    document.removeEventListener("keydown", handleKeyDown, { capture: true });
    window.removeEventListener("blur", handleBlur, { capture: true });
  };

  return {
    session,
    destroy(): void {
      if (resolveActivePointerId(session) !== undefined) session.cancel("view-destroy");
      else releaseListeners();
    }
  };
}

/**
 * Creates one mounted pointer update from a real browser event.
 *
 * @param event - Active owner-pointer event.
 * @returns Versioned command-neutral update facts.
 */
function createBrowserUpdate(event: PointerEvent): EditorUIDragUpdateInput {
  return {
    pointerId: event.pointerId,
    clientPoint: { x: event.clientX, y: event.clientY },
    snapshotVersion: 7,
    insideDropZone: true,
    autoScroll: { kind: "idle" }
  };
}

/**
 * Reads the pointer id from one active browser fixture session.
 *
 * @param session - Command-neutral drag session.
 * @returns Owning pointer id, or undefined after a terminal transition.
 */
function resolveActivePointerId<SourcePayload, TargetPayload>(
  session: DragSession<SourcePayload, TargetPayload>
): number | undefined {
  const state = session.state;
  return state.phase === "armed" || state.phase === "dragging" || state.phase === "targeting"
    ? state.pointerId
    : undefined;
}

/**
 * Creates one browser arm input from a stable identity range.
 *
 * @returns Owner pointer and source facts.
 */
function createBrowserArmInput() {
  return {
    pointerId: 4,
    pressClientPoint: { x: 0, y: 0 },
    source: {
      selection: createBlockSourceSelection(),
      payload: { kind: "block" }
    }
  } as const;
}

/**
 * Creates one real browser pointer event owned by the fixture session.
 *
 * @param type - Pointer event type.
 * @param clientX - Client x coordinate beyond the threshold.
 * @returns Bubbling browser pointer event.
 */
function createPointerEvent(type: string, clientX: number): PointerEvent {
  return new PointerEvent(type, {
    pointerId: 4,
    clientX,
    clientY: 0,
    bubbles: true
  });
}
