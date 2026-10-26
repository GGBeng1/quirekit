/** Fake event listener registry used by mounted SVG tests. */
export class FakeSvgEventListeners {
  private readonly listeners = new Map<string, Set<EventListener>>();

  /**
   * Registers a fake DOM event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  add(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();

    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  /**
   * Removes a fake DOM event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  remove(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Dispatches a fake DOM event to registered listeners.
   *
   * @param target - Listener `this` value.
   * @param event - Event-like object to dispatch.
   * @returns Whether dispatch completed.
   */
  dispatch(target: unknown, event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener.call(target, event);
    }

    return true;
  }
}
