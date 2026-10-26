import type {
  QuireViewNamedEventBinding,
  QuireViewDispatchResult,
  QuireViewEventBinding
} from "../types";

/** Result produced by dispatching one event binding. */
export interface QuireViewBindingDispatchResult {
  /** Whether the binding found a handler and the handler did not return false. */
  readonly handled: boolean;
  /** Whether the event requested default runtime behavior to be skipped. */
  readonly defaultPrevented: boolean;
  /** Whether the event requested propagation to stop. */
  readonly propagationStopped: boolean;
  /** Whether the event requested pointer capture. */
  readonly pointerCaptureRequested: boolean;
}

/** Empty dispatch result reused when no target or binding is available. */
export const emptyDispatchResult: QuireViewDispatchResult = {
  handled: false,
  defaultPrevented: false,
  pointerCaptureRequested: false
};

/**
 * Converts an internal binding result to the public dispatch result.
 *
 * @param result - Internal binding dispatch result.
 * @returns Public dispatch result.
 */
export function mapBindingResult(
  result: QuireViewBindingDispatchResult
): QuireViewDispatchResult {
  return {
    handled: result.handled,
    defaultPrevented: result.defaultPrevented,
    pointerCaptureRequested: result.pointerCaptureRequested
  };
}

/**
 * Returns whether a binding object names a registered event handler.
 *
 * @param binding - Event binding to inspect.
 * @returns True when the binding names a registered event handler.
 */
export function isQuireViewNamedEventBinding<TPayload>(
  binding: QuireViewEventBinding<unknown, TPayload>
): binding is QuireViewNamedEventBinding<TPayload> {
  return typeof binding === "object" && binding !== null && "handler" in binding;
}
