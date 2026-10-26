import type {
  QuireViewContextKey,
  QuireViewDispatchOptions,
  QuireViewDispatchResult,
  QuireViewEvent,
  QuireViewEventHandler,
  QuireViewEventInit,
  QuireViewHost,
  QuireViewScope,
  QuireViewScopeOptions
} from "../types";
import { dispatchQuireViewEventResult } from "./dispatch";
import { DefaultQuireViewEvent } from "./event";

/**
 * Creates a view runtime scope for qkView event dispatch.
 *
 * @param options - Initial context and named event handlers.
 * @returns Runtime view scope.
 */
export function createQuireViewScope<TContext = unknown>(
  options: QuireViewScopeOptions<TContext> = {}
): QuireViewScope<TContext> {
  return new DefaultQuireViewScope(options);
}

/** Runtime view scope implementation backed by per-scope maps. */
class DefaultQuireViewScope<TContext> implements QuireViewScope<TContext> {
  /** Provided values keyed by context-key symbol. */
  private readonly providedValues = new Map<symbol, unknown>();
  /** Named event handlers keyed by stable handler id. */
  private readonly eventHandlers = new Map<string, QuireViewEventHandler<TContext>>();
  /** Optional dispatch-time context getter. */
  private readonly contextGetter: (() => TContext) | undefined;
  /** Mutable fallback context value. */
  private contextValue: TContext | undefined;
  /** Mutable host surface metadata exposed to future events. */
  private hostValue: QuireViewHost | undefined;

  /**
   * Creates one runtime view scope.
   *
   * @param options - Initial context and named event handlers.
   */
  constructor(options: QuireViewScopeOptions<TContext>) {
    this.contextValue = options.context;
    this.hostValue = options.host;
    this.contextGetter = options.getContext;

    for (const [id, handler] of Object.entries(options.eventHandlers ?? {})) {
      this.eventHandlers.set(id, handler);
    }
  }

  /**
   * Updates the default runtime context object for future events.
   *
   * @param context - Context object to expose as `event.context`.
   * @returns Nothing.
   */
  setContext(context: TContext): void {
    this.contextValue = context;
  }

  /**
   * Updates the host surface object exposed to future events.
   *
   * @param host - Host surface metadata, or undefined when the scope is detached.
   * @returns Nothing.
   */
  setHost(host: QuireViewHost | undefined): void {
    this.hostValue = host;
  }

  /**
   * Reads the current host surface object.
   *
   * @returns Current host surface metadata, or undefined.
   */
  getHost(): QuireViewHost | undefined {
    return this.hostValue;
  }

  /**
   * Reads the current runtime context.
   *
   * @returns Current context.
   */
  getContext(): TContext {
    if (this.contextGetter !== undefined) {
      return this.contextGetter();
    }

    return this.contextValue as TContext;
  }

  /**
   * Provides a typed dependency for future events.
   *
   * @param key - Dependency key.
   * @param value - Dependency value.
   * @returns Nothing.
   */
  provide<TValue>(key: QuireViewContextKey<TValue>, value: TValue): void {
    this.providedValues.set(key.id, value);
  }

  /**
   * Reads a provided dependency.
   *
   * @param key - Dependency key.
   * @returns Provided value or undefined.
   */
  inject<TValue>(key: QuireViewContextKey<TValue>): TValue | undefined {
    return this.providedValues.get(key.id) as TValue | undefined;
  }

  /**
   * Reads a required provided dependency.
   *
   * @param key - Dependency key.
   * @returns Provided value.
   */
  require<TValue>(key: QuireViewContextKey<TValue>): TValue {
    const value = this.inject(key);

    if (value === undefined) {
      throw new Error(`Missing qkView context value for "${key.name}".`);
    }

    return value;
  }

  /**
   * Registers one named event handler.
   *
   * @param id - Event-handler id.
   * @param handler - Event handler.
   * @returns Cleanup function that unregisters this handler.
   */
  registerEventHandler<TPayload = unknown>(
    id: string,
    handler: QuireViewEventHandler<TContext, TPayload>
  ): () => void {
    this.eventHandlers.set(id, handler as QuireViewEventHandler<TContext>);

    return () => {
      if (this.eventHandlers.get(id) === handler) {
        this.eventHandlers.delete(id);
      }
    };
  }

  /**
   * Dispatches one target or semantic event through this scope.
   *
   * @param options - Event dispatch options.
   * @returns True when a direct or named handler handled the event.
   */
  dispatchViewEvent<TPayload = unknown>(
    options: QuireViewDispatchOptions<TContext, TPayload>
  ): boolean {
    return this.dispatchViewEventResult(options).handled;
  }

  /**
   * Dispatches one target or semantic event and exposes cancellation state.
   *
   * @param options - Event dispatch options.
   * @returns Detailed dispatch result including default-prevention state.
   */
  dispatchViewEventResult<TPayload = unknown>(
    options: QuireViewDispatchOptions<TContext, TPayload>
  ): QuireViewDispatchResult {
    return dispatchQuireViewEventResult({
      eventHandlers: this.eventHandlers,
      createEvent: (eventOptions) => this.createEvent(eventOptions)
    }, options);
  }

  /**
   * Releases provided values and registered event handlers.
   *
   * @returns Nothing.
   */
  destroy(): void {
    this.providedValues.clear();
    this.eventHandlers.clear();
    this.contextValue = undefined;
    this.hostValue = undefined;
  }

  /**
   * Creates a mutable event facade for one dispatch.
   *
   * @param options - Event initialization data.
   * @returns Runtime event facade.
   */
  private createEvent<TPayload>(
    options: QuireViewEventInit<TContext, TPayload>
  ): QuireViewEvent<TContext, TPayload> {
    return new DefaultQuireViewEvent(this, options);
  }
}
