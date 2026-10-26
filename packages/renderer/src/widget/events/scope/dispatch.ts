import type {
  QuireViewDispatchOptions,
  QuireViewDispatchResult,
  QuireViewEvent,
  QuireViewEventHandler,
  QuireViewEventBinding,
  QuireViewEventInit
} from "../types";
import {
  emptyDispatchResult,
  mapBindingResult,
  type QuireViewBindingDispatchResult
} from "./binding";

/** Runtime state needed by the event dispatch helper. */
export interface QuireViewScopeDispatchState<TContext> {
  /** Named event handlers keyed by stable handler id. */
  readonly eventHandlers: ReadonlyMap<string, QuireViewEventHandler<TContext>>;
  /**
   * Creates an event object for one dispatch.
   *
   * @param options - Event initialization data.
   * @returns Runtime event facade.
   */
  createEvent<TPayload>(
    options: QuireViewEventInit<TContext, TPayload>
  ): QuireViewEvent<TContext, TPayload>;
}

/**
 * Dispatches one target or semantic event and exposes cancellation state.
 *
 * @param state - Scope-owned dispatch state.
 * @param options - Event dispatch options.
 * @returns Detailed dispatch result including default-prevention state.
 */
export function dispatchQuireViewEventResult<TContext, TPayload = unknown>(
  state: QuireViewScopeDispatchState<TContext>,
  options: QuireViewDispatchOptions<TContext, TPayload>
): QuireViewDispatchResult {
  if (options.binding !== undefined) {
    return mapBindingResult(dispatchBinding(state, options.binding, options));
  }

  const path = options.path ?? (options.target === undefined ? [] : [options.target]);

  if (path.length === 0) {
    return emptyDispatchResult;
  }

  const target = options.target ?? path[0];

  if (target === undefined) {
    return emptyDispatchResult;
  }

  let handled = false;
  let defaultPrevented = false;
  let pointerCaptureRequested = false;

  for (const currentTarget of path) {
    const binding = currentTarget.events[options.type];

    if (binding === undefined) {
      continue;
    }

    const result = dispatchBinding(state, binding, {
      ...options,
      target,
      currentTarget,
      path
    });

    handled ||= result.handled;
    defaultPrevented ||= result.defaultPrevented;
    pointerCaptureRequested ||= result.pointerCaptureRequested;

    if (result.propagationStopped) {
      break;
    }
  }

  return {
    handled,
    defaultPrevented,
    pointerCaptureRequested
  };
}

/**
 * Dispatches one normalized binding.
 *
 * @param state - Scope-owned dispatch state.
 * @param binding - Binding selected from a target or explicit dispatch.
 * @param options - Event initialization data.
 * @returns Binding dispatch result.
 */
function dispatchBinding<TContext, TPayload>(
  state: QuireViewScopeDispatchState<TContext>,
  binding: QuireViewEventBinding<TContext, TPayload>,
  options: QuireViewEventInit<TContext, TPayload>
): QuireViewBindingDispatchResult {
  if (typeof binding === "function") {
    const event = state.createEvent(options);
    const result = binding(event);

    return {
      handled: result !== false,
      defaultPrevented: event.defaultPrevented,
      propagationStopped: event.propagationStopped,
      pointerCaptureRequested: event.pointerCaptureRequested
    };
  }

  return dispatchNamedHandler(state, binding.handler, {
    ...options,
    payload: binding.payload as TPayload
  });
}

/**
 * Dispatches one named event handler.
 *
 * @param state - Scope-owned dispatch state.
 * @param id - Registered handler id to dispatch.
 * @param options - Event initialization data.
 * @returns Binding dispatch result.
 */
function dispatchNamedHandler<TContext, TPayload>(
  state: QuireViewScopeDispatchState<TContext>,
  id: string,
  options: QuireViewEventInit<TContext, TPayload>
): QuireViewBindingDispatchResult {
  const handler = state.eventHandlers.get(id) as
    | QuireViewEventHandler<TContext, TPayload>
    | undefined;

  if (handler === undefined) {
    return {
      handled: false,
      defaultPrevented: false,
      propagationStopped: false,
      pointerCaptureRequested: false
    };
  }

  const event = state.createEvent(options);
  const result = handler(event);

  return {
    handled: result !== false,
    defaultPrevented: event.defaultPrevented,
    propagationStopped: event.propagationStopped,
    pointerCaptureRequested: event.pointerCaptureRequested
  };
}
