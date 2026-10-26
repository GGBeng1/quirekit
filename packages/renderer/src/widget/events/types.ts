import type { QuireDocumentRange } from "../../core/document";
import type {
  QuireHitArea,
  QuirePoint,
  QuireRect
} from "../../core/geometry";

/** Built-in view event names understood by qkView authoring helpers. */
export type QuireViewBuiltinEventName =
  | "click"
  | "contextMenu"
  | "doubleClick"
  | "pointerDown"
  | "pointerEnter"
  | "pointerLeave"
  | "pointerMove"
  | "pointerCancel"
  | "pointerUp";

/** Event name used by the renderer-neutral view event system. */
export type QuireViewEventName = QuireViewBuiltinEventName | (string & {});

/** Pointer-event participation for a compiled view target. */
export type QuireViewPointerEvents = "auto" | "none";

/** Runtime surface kind exposed to view event handlers. */
export type QuireViewHostKind = "canvas" | "svg" | "html" | (string & {});

/** Semantic owner kind used to describe who produced or owns a view target. */
export type QuireViewOwnerKind =
  | "document-node"
  | "document-mark"
  | "decoration"
  | "extension"
  | (string & {});

/** Mounted or standalone host surface exposed through a view scope. */
export interface QuireViewHost<TSurface = unknown> {
  /** Optional stable host id, useful when one editor has clones or previews. */
  readonly id?: string;
  /** Host surface kind. */
  readonly kind: QuireViewHostKind;
  /** Host-owned surface object such as a canvas element, SVG root, or HTML root. */
  readonly surface: TSurface;
  /** Optional renderer-neutral metadata provided by the mounted runtime. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Renderer-neutral owner metadata attached to a compiled view target. */
export interface QuireViewOwner {
  /** Semantic owner kind, intentionally open for editor and standalone consumers. */
  readonly kind: QuireViewOwnerKind;
  /** Optional stable owner id, such as a node id, decoration id, or extension id. */
  readonly id?: string | undefined;
  /** Optional owner name, such as a schema node, mark, extension, or widget family name. */
  readonly name?: string | undefined;
  /** Optional renderer-neutral owner metadata supplied by the producer. */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Event binding that resolves a named handler from the current scope. */
export interface QuireViewNamedEventBinding<TPayload = unknown> {
  /** Event-handler id resolved by the current `QuireViewScope`. */
  readonly handler: string;
  /** Optional payload passed to the event handler. */
  readonly payload?: TPayload;
}

/** Handler invoked directly by the current runtime scope. */
export type QuireViewEventHandler<TContext = unknown, TPayload = unknown> = (
  event: QuireViewEvent<TContext, TPayload>
) => boolean | void;

/** Event binding accepted by qkView nodes and compiled targets. */
export type QuireViewEventBinding<TContext = unknown, TPayload = unknown> =
  | QuireViewNamedEventBinding<TPayload>
  | QuireViewEventHandler<TContext, TPayload>;

/** Event binding map for custom or built-in view events. */
export type QuireViewEventBindingMap<TContext = unknown> = Readonly<
  Partial<Record<QuireViewEventName, QuireViewEventBinding<TContext>>>
>;

/** Interaction metadata carried by declarative view nodes. */
export interface QuireViewInteraction<TContext = unknown> {
  /** Exact hit polygon in node-local coordinates, translated when compiled. */
  readonly hitArea?: QuireHitArea | undefined;
  /** Optional cursor suggested while this target is hovered. */
  readonly cursor?: string;
  /** Optional cursor applied only while this target owns pointer capture. */
  readonly captureCursor?: string;
  /** Whether this target participates in pointer hit testing. */
  readonly pointerEvents?: QuireViewPointerEvents;
  /** Event bindings keyed by built-in or custom event name. */
  readonly events?: QuireViewEventBindingMap<TContext>;
}

/** Compiled target used for hit testing and event dispatch. */
export interface QuireViewTarget<TContext = unknown> {
  /** Stable target id, usually derived from the qkView node id or tree path. */
  readonly id: string;
  /** Path within the compiled qkView tree. */
  readonly nodePath: string;
  /** Resolved target rectangle in renderer coordinate space. */
  readonly rect: QuireRect;
  /** Optional exact geometry evaluated after the coarse rectangle accepts a point. */
  readonly hitArea?: QuireHitArea | undefined;
  /** Optional document range represented by the target. */
  readonly range?: QuireDocumentRange;
  /** Optional semantic role such as `button`, `callout`, or `table-cell`. */
  readonly role?: string;
  /** Optional named part within a larger semantic node. */
  readonly part?: string;
  /** Optional semantic owner that produced or owns this target. */
  readonly owner?: QuireViewOwner;
  /** Whether this target participates in pointer hit testing. */
  readonly pointerEvents: QuireViewPointerEvents;
  /**
   * Optional CSS cursor value shown while this target is hovered. A canvas-painted
   * node declares it through `interaction.cursor` so the mounted runtime can apply
   * a per-node cursor that the canvas surface cannot carry as a DOM element.
   */
  readonly cursor?: string | undefined;
  /**
   * Optional CSS cursor value applied only while this target owns a captured
   * pointer session.
   */
  readonly captureCursor?: string | undefined;
  /** Event bindings available on this target. */
  readonly events: QuireViewEventBindingMap<TContext>;
}

/** Lifecycle phase for one renderer-neutral captured pointer session. */
export type QuireViewPointerSessionPhase = "start" | "update" | "end" | "cancel";

/** Stable pointer facts exposed while a mounted target owns a pointer session. */
export interface QuireViewPointerSession {
  /** Browser pointer identifier that owns this session. */
  readonly pointerId: number;
  /** Current lifecycle phase. */
  readonly phase: QuireViewPointerSessionPhase;
  /** Renderer-space point where the session began. */
  readonly startPoint: QuirePoint;
  /** Renderer-space point dispatched immediately before the current event. */
  readonly previousPoint: QuirePoint;
  /** Current renderer-space point. */
  readonly point: QuirePoint;
  /** Renderer-space displacement from `startPoint` to `point`. */
  readonly delta: QuirePoint;
}

/** Runtime event passed to direct and named qkView handlers. */
export interface QuireViewEvent<TContext = unknown, TPayload = unknown> {
  /** Event name being dispatched. */
  readonly type: QuireViewEventName;
  /** Runtime context returned by the current view scope. */
  readonly context: TContext;
  /** Current host surface exposed by the owning scope. */
  readonly host: QuireViewHost | undefined;
  /** Original target selected by hit testing or explicit dispatch. */
  readonly target: QuireViewTarget<TContext> | undefined;
  /** Current target during capture or bubble dispatch. */
  readonly currentTarget: QuireViewTarget<TContext> | undefined;
  /** Target ancestry path from deepest node to outer node. */
  readonly path: readonly QuireViewTarget<TContext>[];
  /** Pointer location in renderer coordinate space, when available. */
  readonly point: QuirePoint | undefined;
  /** Pointer location in browser client coordinates, when available. */
  readonly clientPoint: QuirePoint | undefined;
  /** Captured pointer-session facts, when this event participates in a session. */
  readonly pointerSession: QuireViewPointerSession | undefined;
  /** Payload supplied by an named-handler binding or semantic event emitter. */
  readonly payload: TPayload | undefined;
  /** Original platform event, intentionally typed as unknown for portability. */
  readonly nativeEvent: unknown;
  /** Whether default editor/runtime behavior should be skipped. */
  readonly defaultPrevented: boolean;
  /** Whether event propagation should stop at the current target. */
  readonly propagationStopped: boolean;
  /** Whether this event requested a renderer-neutral pointer capture session. */
  readonly pointerCaptureRequested: boolean;
  /**
   * Reads a provided dependency from the current scope.
   *
   * @param key - Context key to read.
   * @returns Provided value or undefined.
   */
  inject<TValue>(key: QuireViewContextKey<TValue>): TValue | undefined;
  /**
   * Reads a required dependency from the current scope.
   *
   * @param key - Context key to read.
   * @returns Provided value.
   */
  require<TValue>(key: QuireViewContextKey<TValue>): TValue;
  /**
   * Prevents default runtime behavior for this event.
   *
   * @returns Nothing.
   */
  preventDefault(): void;
  /**
   * Stops propagation through the target path.
   *
   * @returns Nothing.
   */
  stopPropagation(): void;
  /**
   * Requests that subsequent move, up, and cancel events stay on this target path.
   *
   * @returns Nothing.
   */
  capturePointer(): void;
}

/** Typed dependency key used by view-scope provide/inject. */
export interface QuireViewContextKey<TValue> {
  /** Unique symbol used to avoid collisions between packages. */
  readonly id: symbol;
  /** Human-readable name used for diagnostics. */
  readonly name: string;
  /**
   * Optional compile-time witness that ties this key to its provided value.
   *
   * Runtime keys only need an id and name. The witness prevents keys for
   * unrelated value types from becoming structurally interchangeable.
   */
  readonly __quireContextValue?: TValue | undefined;
}

/** Initial data used to create a runtime view event. */
export interface QuireViewEventInit<TContext = unknown, TPayload = unknown> {
  /** Event name to dispatch. */
  readonly type: QuireViewEventName;
  /** Target selected by hit testing or explicit semantic dispatch. */
  readonly target?: QuireViewTarget<TContext>;
  /** Current target for this dispatch pass. */
  readonly currentTarget?: QuireViewTarget<TContext>;
  /** Target ancestry path from deepest to outermost. */
  readonly path?: readonly QuireViewTarget<TContext>[];
  /** Pointer location in renderer coordinate space. */
  readonly point?: QuirePoint;
  /** Pointer location in browser client coordinates. */
  readonly clientPoint?: QuirePoint;
  /** Captured pointer-session facts supplied by the mounted runtime. */
  readonly pointerSession?: QuireViewPointerSession;
  /** Optional payload supplied by the dispatcher. */
  readonly payload?: TPayload;
  /** Original platform event. */
  readonly nativeEvent?: unknown;
}

/** Options passed when dispatching one view event through a scope. */
export interface QuireViewDispatchOptions<TContext = unknown, TPayload = unknown>
  extends QuireViewEventInit<TContext, TPayload> {
  /** Optional binding override; when omitted, the target binding is used. */
  readonly binding?: QuireViewEventBinding<TContext, TPayload>;
}

/** Detailed result returned by view-event dispatch. */
export interface QuireViewDispatchResult {
  /** Whether a handler or action handled the event. */
  readonly handled: boolean;
  /** Whether any handler called `event.preventDefault()`. */
  readonly defaultPrevented: boolean;
  /** Whether a handler requested pointer capture for this dispatch. */
  readonly pointerCaptureRequested: boolean;
}

/** Runtime scope that owns context, provided values, event handlers, and dispatch. */
export interface QuireViewScope<TContext = unknown> {
  /**
   * Updates the default runtime context object for future events.
   *
   * @param context - Context object to expose as `event.context`.
   * @returns Nothing.
   */
  setContext(context: TContext): void;
  /**
   * Updates the host surface object exposed to future events.
   *
   * @param host - Host surface metadata, or undefined when the scope is detached.
   * @returns Nothing.
   */
  setHost(host: QuireViewHost | undefined): void;
  /**
   * Reads the current host surface object.
   *
   * @returns Current host surface metadata, or undefined.
   */
  getHost(): QuireViewHost | undefined;
  /**
   * Reads the current runtime context.
   *
   * @returns Current context.
   */
  getContext(): TContext;
  /**
   * Provides a typed dependency for future events.
   *
   * @param key - Dependency key.
   * @param value - Dependency value.
   * @returns Nothing.
   */
  provide<TValue>(key: QuireViewContextKey<TValue>, value: TValue): void;
  /**
   * Reads a provided dependency.
   *
   * @param key - Dependency key.
   * @returns Provided value or undefined.
   */
  inject<TValue>(key: QuireViewContextKey<TValue>): TValue | undefined;
  /**
   * Reads a required provided dependency.
   *
   * @param key - Dependency key.
   * @returns Provided value.
   */
  require<TValue>(key: QuireViewContextKey<TValue>): TValue;
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
  ): () => void;
  /**
   * Dispatches one target or semantic event through this scope.
   *
   * @param options - Event dispatch options.
   * @returns True when a direct or named handler handled the event.
   */
  dispatchViewEvent<TPayload = unknown>(
    options: QuireViewDispatchOptions<TContext, TPayload>
  ): boolean;
  /**
   * Dispatches one target or semantic event and exposes cancellation state.
   *
   * @param options - Event dispatch options.
   * @returns Detailed dispatch result including default-prevention state.
   */
  dispatchViewEventResult<TPayload = unknown>(
    options: QuireViewDispatchOptions<TContext, TPayload>
  ): QuireViewDispatchResult;
  /**
   * Releases provided values and registered event handlers.
   *
   * @returns Nothing.
   */
  destroy(): void;
}

/** Options used to create a `QuireViewScope`. */
export interface QuireViewScopeOptions<TContext = unknown> {
  /** Initial context object used by `event.context`. */
  readonly context?: TContext;
  /** Initial host surface exposed as `event.host`. */
  readonly host?: QuireViewHost;
  /** Lazy context getter used when context should be read at dispatch time. */
  readonly getContext?: () => TContext;
  /** Initial named event handlers to register on the scope. */
  readonly eventHandlers?: Readonly<Record<string, QuireViewEventHandler<TContext>>>;
}
