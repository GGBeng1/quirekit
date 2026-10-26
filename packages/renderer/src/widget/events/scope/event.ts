import type {
  QuireViewContextKey,
  QuireViewEvent,
  QuireViewEventInit,
  QuireViewScope
} from "../types";

/** Mutable event facade exposed through an immutable-looking interface. */
export class DefaultQuireViewEvent<TContext, TPayload>
  implements QuireViewEvent<TContext, TPayload>
{
  /** Event name being dispatched. */
  readonly type;
  /** Runtime context returned by the current view scope. */
  readonly context;
  /** Current host surface exposed by the owning scope. */
  readonly host;
  /** Original target selected by hit testing or explicit dispatch. */
  readonly target;
  /** Current target during capture or bubble dispatch. */
  readonly currentTarget;
  /** Target ancestry path from deepest node to outer node. */
  readonly path;
  /** Pointer location in renderer coordinate space, when available. */
  readonly point;
  /** Pointer location in browser client coordinates, when available. */
  readonly clientPoint;
  /** Captured pointer-session facts, when this event participates in a session. */
  readonly pointerSession;
  /** Payload supplied by an named-handler binding or semantic event emitter. */
  readonly payload;
  /** Original platform event, intentionally typed as unknown for portability. */
  readonly nativeEvent;
  /** Whether default editor/runtime behavior should be skipped. */
  defaultPrevented = false;
  /** Whether event propagation should stop at the current target. */
  propagationStopped = false;
  /** Whether this event requested a renderer-neutral pointer capture session. */
  pointerCaptureRequested = false;

  /**
   * Creates one event facade.
   *
   * @param scope - Scope that owns context and provided dependencies.
   * @param options - Event initialization data.
   */
  constructor(
    private readonly scope: QuireViewScope<TContext>,
    options: QuireViewEventInit<TContext, TPayload>
  ) {
    this.type = options.type;
    this.context = scope.getContext();
    this.host = scope.getHost();
    this.target = options.target;
    this.currentTarget = options.currentTarget ?? options.target;
    this.path = options.path ?? (options.target === undefined ? [] : [options.target]);
    this.point = options.point;
    this.clientPoint = options.clientPoint;
    this.pointerSession = options.pointerSession;
    this.payload = options.payload;
    this.nativeEvent = options.nativeEvent;
  }

  /**
   * Reads a provided dependency from the current scope.
   *
   * @param key - Context key to read.
   * @returns Provided value or undefined.
   */
  inject<TValue>(key: QuireViewContextKey<TValue>): TValue | undefined {
    return this.scope.inject(key);
  }

  /**
   * Reads a required dependency from the current scope.
   *
   * @param key - Context key to read.
   * @returns Provided value.
   */
  require<TValue>(key: QuireViewContextKey<TValue>): TValue {
    return this.scope.require(key);
  }

  /**
   * Prevents default runtime behavior for this event.
   *
   * @returns Nothing.
   */
  preventDefault(): void {
    this.defaultPrevented = true;
  }

  /**
   * Stops propagation through the target path.
   *
   * @returns Nothing.
   */
  stopPropagation(): void {
    this.propagationStopped = true;
  }

  /**
   * Requests that subsequent pointer events stay on this event's target path.
   *
   * @returns Nothing.
   */
  capturePointer(): void {
    this.pointerCaptureRequested = true;
  }
}
