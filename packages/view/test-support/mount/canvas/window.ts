/** Fake window used by mounted canvas view tests. */
export class FakeCanvasMountWindow {
  /** Nonempty browser viewport; tests can explicitly model hidden hosts with zero sizes. */
  innerWidth = 320;
  /** Visible browser height for ancestor scrolling. */
  innerHeight = 260;
  private readonly listeners = new Map<string, EventListener[]>();

  /**
   * Adds a fake window event listener.
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
   * Removes a fake window event listener.
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
}
