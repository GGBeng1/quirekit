/** String keys from an event map. */
type StringKeyOf<Events extends object> = Extract<keyof Events, string>;

/** Arguments emitted for an event. */
type EventArguments<
  Events extends object,
  EventName extends StringKeyOf<Events>
> = [Events[EventName]] extends [void]
  ? []
  : [payload: Events[EventName]];

/** Callback function for an event. */
type EventCallback<
  Events extends object,
  EventName extends StringKeyOf<Events>
> = (...args: EventArguments<Events, EventName>) => void;

/** Tiptap-compatible typed event emitter. */
export class EventEmitter<Events extends object> {
  /** Registered callbacks keyed by event name. */
  private callbacks: Partial<Record<StringKeyOf<Events>, Array<(...args: unknown[]) => void>>> = {};

  /**
   * Registers an event callback.
   *
   * @param event - Event name.
   * @param callback - Callback to register.
   * @returns This emitter.
   */
  on<EventName extends StringKeyOf<Events>>(
    event: EventName,
    callback: EventCallback<Events, EventName>
  ): this {
    const callbacks = this.callbacks[event] ?? [];
    callbacks.push(callback as (...args: unknown[]) => void);
    this.callbacks[event] = callbacks;

    return this;
  }

  /**
   * Registers an event callback that is removed after its first call.
   *
   * @param event - Event name.
   * @param callback - Callback to register once.
   * @returns This emitter.
   */
  once<EventName extends StringKeyOf<Events>>(
    event: EventName,
    callback: EventCallback<Events, EventName>
  ): this {
    const onceCallback = (...args: EventArguments<Events, EventName>): void => {
      this.off(event, onceCallback);
      callback(...args);
    };

    return this.on(event, onceCallback);
  }

  /**
   * Emits an event to registered callbacks.
   *
   * @param event - Event name.
   * @param args - Event arguments.
   * @returns This emitter.
   */
  emit<EventName extends StringKeyOf<Events>>(
    event: EventName,
    ...args: EventArguments<Events, EventName>
  ): this {
    for (const callback of this.callbacks[event] ?? []) {
      callback(...args);
    }

    return this;
  }

  /**
   * Removes one callback or every callback for an event.
   *
   * @param event - Event name.
   * @param callback - Optional callback to remove.
   * @returns This emitter.
   */
  off<EventName extends StringKeyOf<Events>>(
    event: EventName,
    callback?: EventCallback<Events, EventName>
  ): this {
    const callbacks = this.callbacks[event];

    if (!callbacks) {
      return this;
    }

    if (!callback) {
      delete this.callbacks[event];
      return this;
    }

    this.callbacks[event] = callbacks.filter((item) => item !== callback);

    return this;
  }

  /** Removes every registered callback. */
  removeAllListeners(): void {
    this.callbacks = {};
  }
}
