import { FakeCanvasMountElement } from "./element";
import { FakeCanvasMountWindow } from "./window";

/** Fake document used by mounted canvas view tests. */
export class FakeCanvasMountDocument {
  /** Currently focused fake element. */
  activeElement: FakeCanvasMountElement | null = null;

  /** Minimal window-like object used by mounted resize tests. */
  readonly defaultView = new FakeCanvasMountWindow();

  private readonly listeners = new Map<string, EventListener[]>();

  /**
   * Creates a fake element with the requested tag name.
   *
   * @param tagName - Element tag name.
   * @returns Fake mounted view element.
   */
  createElement(tagName: string): FakeCanvasMountElement {
    return new FakeCanvasMountElement(tagName, this);
  }

  /**
   * Returns a fake selection object.
   *
   * @returns Fake selection with a no-op range clearer.
   */
  getSelection(): { removeAllRanges: () => void } {
    return {
      removeAllRanges: (): void => {}
    };
  }

  /**
   * Adds a fake document event listener.
   *
   * @param type - Event type to bind.
   * @param listener - Listener to register.
   */
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];

    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  /**
   * Removes a fake document event listener.
   *
   * @param type - Event type to unbind.
   * @param listener - Listener to remove.
   */
  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];

    this.listeners.set(
      type,
      listeners.filter((entry) => entry !== listener)
    );
  }

  /**
   * Dispatches a fake document event to registered listeners.
   *
   * @param event - Event-like payload to dispatch.
   * @returns Whether dispatch completed.
   */
  dispatchEvent(event: Event & { type: string }): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }

    return true;
  }

  /**
   * Reads registered document listener count for assertions.
   *
   * @param type - Event type to inspect.
   * @returns Number of registered listeners.
   */
  listenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }
}
