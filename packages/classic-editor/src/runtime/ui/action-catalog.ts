import type {
  ClassicEditorActionContext,
  ClassicEditorActionDefinition,
  ClassicEditorActionState,
  ClassicEditorRenderContext
} from "../../types";
import { createUnavailableClassicEditorActionState, readAvailableClassicEditorActionState } from "./action-state";

/** Resolves state and executes direct typed actions without the legacy behavior runtime. */
export class ClassicEditorActionCatalog {
  private readonly definitionsValue: readonly ClassicEditorActionDefinition[];

  /**
   * Creates a catalog with stable ids and deterministic source order.
   *
   * @param actions - Typed actions available to product surfaces.
   */
  constructor(actions: readonly ClassicEditorActionDefinition[]) {
    const actionIds = new Set<string>();
    for (const action of actions) {
      if (actionIds.has(action.id)) {
        throw new RangeError(`Classic Editor action ids must be unique: ${action.id}`);
      }
      actionIds.add(action.id);
    }
    this.definitionsValue = Object.freeze([...actions].sort((left, right) => (
      left.order - right.order
    )));
  }

  /**
   * Ordered typed action definitions for surface projection and diagnostics.
   * Consumers must retain a definition object to execute; ids never dispatch actions.
   */
  get definitions(): readonly ClassicEditorActionDefinition[] {
    return this.definitionsValue;
  }

  /**
   * Resolves one action's visible state for a surface occurrence.
   *
   * @param action - Direct action definition.
   * @param context - Mounted render context.
   * @param payload - Surface-owned typed payload.
   * @param source - Surface that presents the action.
   * @param detail - Optional normalized trigger detail.
   * @returns Immutable presentation state.
   */
  resolve(
    action: ClassicEditorActionDefinition,
    context: ClassicEditorRenderContext,
    payload: unknown,
    source: ClassicEditorActionContext["trigger"]["source"],
    detail?: unknown
  ): ClassicEditorActionState {
    return resolveClassicEditorActionState(action, context, payload, source, detail);
  }

  /**
   * Runs a direct action exactly once when it is presently executable.
   *
   * @param action - Direct action definition.
   * @param context - Mounted render context.
   * @param payload - Surface-owned typed payload.
   * @param source - Surface that invokes the action.
   * @param detail - Optional normalized trigger detail.
   * @returns Whether the action handled the request.
   */
  async execute(
    action: ClassicEditorActionDefinition,
    context: ClassicEditorRenderContext,
    payload: unknown,
    source: ClassicEditorActionContext["trigger"]["source"],
    detail?: unknown
  ): Promise<boolean> {
    return executeClassicEditorAction(action, context, payload, source, detail);
  }
}

/**
 * Creates the one typed context accepted by direct actions.
 *
 * @param context - Mounted product render context.
 * @param payload - Surface-owned typed payload.
 * @param source - Invoking surface.
 * @param detail - Optional normalized trigger detail.
 * @returns Direct action context.
 */
export function createActionContext(
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: ClassicEditorActionContext["trigger"]["source"],
  detail?: unknown
): ClassicEditorActionContext {
  return Object.freeze({
    ...context,
    payload,
    trigger: Object.freeze({ source, detail })
  });
}

/**
 * Resolves direct action state without requiring a string action lookup.
 *
 * @param action - Direct typed action definition.
 * @param context - Mounted product render context.
 * @param payload - Surface-owned typed payload.
 * @param source - Surface that presents the action.
 * @param detail - Optional normalized trigger detail.
 * @returns Immutable direct-action state.
 */
export function resolveClassicEditorActionState(
  action: ClassicEditorActionDefinition,
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: ClassicEditorActionContext["trigger"]["source"],
  detail?: unknown
): ClassicEditorActionState {
  const actionContext = createActionContext(context, payload, source, detail);
  const available = action.isAvailable?.(actionContext) !== false;
  if (!available) {
    return createUnavailableClassicEditorActionState();
  }
  return readAvailableClassicEditorActionState(action, actionContext);
}

/**
 * Executes a direct action without the legacy behavior runtime.
 *
 * @param action - Direct typed action definition.
 * @param context - Mounted product render context.
 * @param payload - Surface-owned typed payload.
 * @param source - Surface that invokes the action.
 * @param detail - Optional normalized trigger detail.
 * @returns Whether the action handled the request.
 */
export function executeClassicEditorAction(
  action: ClassicEditorActionDefinition,
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: ClassicEditorActionContext["trigger"]["source"],
  detail?: unknown
): Promise<boolean> {
  const actionContext = createActionContext(context, payload, source, detail);
  if (
    action.isAvailable?.(actionContext) === false
    || action.canExecute?.(actionContext) === false
  ) return Promise.resolve(false);
  return Promise.resolve(action.run(actionContext));
}
