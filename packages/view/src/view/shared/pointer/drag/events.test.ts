import { describe, expect, it } from "vitest";
import { bindMountedPointerDragDocumentEvents } from "./events";

describe("mounted pointer drag document events", () => {
  it("binds active drag listeners in the capture phase", () => {
    const ownerDocument = new RecordingPointerDragDocument();
    const handlePointerMove = (): void => {};
    const handlePointerEnd = (): void => {};

    const cleanup = bindMountedPointerDragDocumentEvents({
      ownerDocument: ownerDocument as unknown as Document,
      handlePointerMove,
      handlePointerEnd
    });

    expect(ownerDocument.addedOptions()).toEqual([
      ["pointermove", true],
      ["pointerup", true],
      ["pointercancel", true]
    ]);
    expect(ownerDocument.defaultView.addedOptions()).toEqual([
      ["pointermove", true],
      ["pointerup", true],
      ["pointercancel", true]
    ]);

    cleanup();

    expect(ownerDocument.removedOptions()).toEqual([
      ["pointermove", true],
      ["pointerup", true],
      ["pointercancel", true]
    ]);
    expect(ownerDocument.defaultView.removedOptions()).toEqual([
      ["pointermove", true],
      ["pointerup", true],
      ["pointercancel", true]
    ]);
  });
});

/** Recorded document listener operation. */
interface RecordedPointerDragDocumentListener {
  /** Event type that was bound or unbound. */
  readonly type: string;
  /** Whether the listener was registered for capture phase. */
  readonly capture: boolean;
}

/** Fake event target that records listener phase options for pointer drag tests. */
class RecordingPointerDragEventTarget {
  private readonly added: RecordedPointerDragDocumentListener[] = [];
  private readonly removed: RecordedPointerDragDocumentListener[] = [];

  /**
   * Records a document listener registration.
   *
   * @param type - Event type to bind.
   * @param listener - Listener being registered.
   * @param options - DOM listener options.
   */
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
  ): void {
    void listener;
    this.added.push({ type, capture: resolveListenerCapture(options) });
  }

  /**
   * Records a document listener removal.
   *
   * @param type - Event type to unbind.
   * @param listener - Listener being removed.
   * @param options - DOM listener options.
   */
  removeEventListener(
    type: string,
    listener: EventListener,
    options?: EventListenerOptions | boolean
  ): void {
    void listener;
    this.removed.push({ type, capture: resolveListenerCapture(options) });
  }

  /**
   * Reads the captured listener registration options.
   *
   * @returns Event type and capture flag pairs.
   */
  addedOptions(): Array<[string, boolean]> {
    return this.added.map((entry) => [entry.type, entry.capture]);
  }

  /**
   * Reads the captured listener removal options.
   *
   * @returns Event type and capture flag pairs.
   */
  removedOptions(): Array<[string, boolean]> {
    return this.removed.map((entry) => [entry.type, entry.capture]);
  }
}

/** Fake document that records listener phase options for pointer drag tests. */
class RecordingPointerDragDocument extends RecordingPointerDragEventTarget {
  /** Fake default view paired with this document. */
  readonly defaultView = new RecordingPointerDragEventTarget();
}

/**
 * Resolves a listener capture flag from DOM listener options.
 *
 * @param options - Listener options passed to add/remove event listener.
 * @returns Whether the listener uses capture phase.
 */
function resolveListenerCapture(options: AddEventListenerOptions | boolean | undefined): boolean {
  if (typeof options === "boolean") {
    return options;
  }

  return options?.capture === true;
}
