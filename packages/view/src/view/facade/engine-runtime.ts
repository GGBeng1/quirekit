import type { QuireViewEngineRuntime } from "@quirekit/view-engine";

const runtimeByView = new WeakMap<object, QuireViewEngineRuntime>();

/**
 * Registers one mounted facade with its opaque View Engine runtime.
 *
 * @param view - Facade object that owns the runtime.
 * @param runtime - Engine runtime created for the facade.
 */
export function registerQuireViewEngineRuntime(
  view: object,
  runtime: QuireViewEngineRuntime
): void {
  if (runtimeByView.has(view)) {
    throw new Error("QuireView Engine runtime is already registered.");
  }
  runtimeByView.set(view, runtime);
}

/**
 * Reads the opaque View Engine runtime registered for one facade.
 *
 * @param view - Registered facade object.
 * @returns Engine-owned runtime shared with mounted orchestration.
 */
export function requireQuireViewEngineRuntime(
  view: object
): QuireViewEngineRuntime {
  const runtime = runtimeByView.get(view);
  if (runtime === undefined) {
    throw new Error("QuireView Engine runtime is not registered.");
  }
  return runtime;
}
